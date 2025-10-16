import { spawn } from "child_process";
import { EventEmitter } from "events";
import { promises as fs, existsSync } from "node:fs";
import { tmpdir } from "os";
import { join } from "path/posix";
import { WebSocket, Data } from "ws";
import { StreamConfig, WSMessage, ElevenLabsConfig } from "./types";
import { validatePlaybackSpeed } from "../voice/settings";

/**
 * Manages the audio streaming and playback process
 * Uses EventEmitter for better separation of concerns and testability
 *
 * Design decisions:
 * - Single responsibility: Handles only audio streaming and playback
 * - Event-based: Allows loose coupling between stream processing and playback
 * - Temporary files: Used instead of memory buffers to handle large audio streams
 *   without consuming excessive memory
 */
export class AudioManager extends EventEmitter {
  private readonly wsUrl: string;
  private readonly tempFile: string;
  private ws: WebSocket | null = null;
  private streamState = {
    isPlaying: false,
    chunksReceived: 0,
  };

  constructor(private readonly config: StreamConfig) {
    super();
    this.wsUrl = this.buildWebSocketUrl(config.voiceId);
    this.tempFile = this.createTempFilePath();
  }

  /**
   * Main entry point for streaming and playing audio
   * Orchestrates the streaming process while maintaining clean separation of concerns
   */
  async streamAndPlay(): Promise<void> {
    console.log("Starting audio stream process");

    try {
      // Initialize stream first to ensure WebSocket connection is ready
      await this.initializeStream();
      console.log("Stream initialization complete, waiting for completion");

      // Wait for all chunks to be received and processed
      await this.waitForStreamCompletion();
      console.log("Stream and playback completed successfully");
    } finally {
      // Ensure cleanup runs even if errors occur during streaming
      await this.cleanup();
    }
  }

  /**
   * Builds WebSocket URL with appropriate parameters
   * Uses eleven_monolingual_v1 model for optimal streaming performance
   */
  private buildWebSocketUrl(voiceId: string): string {
    // Use monolingual model for better streaming performance
    const modelId = "eleven_monolingual_v1";
    console.log(`Building WebSocket URL for voice ${voiceId} with model ${modelId}`);
    return `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}`;
  }

  /**
   * Creates unique temporary file path for audio chunks
   * Uses system temp directory to ensure proper cleanup
   */
  private createTempFilePath(): string {
    // Use timestamp to ensure unique file names for concurrent operations
    const timestamp = Date.now();
    const filePath = join(tmpdir(), `raycast-tts-${timestamp}.mp3`);
    console.log(`Created temporary file path: ${filePath}`);
    return filePath;
  }

  /**
   * Initializes WebSocket connection and sets up event handlers
   * Separates connection setup from message handling
   */
  private async initializeStream(): Promise<void> {
    console.log("Initializing WebSocket connection...");

    // Create WebSocket with API key authentication
    this.ws = new WebSocket(this.wsUrl, {
      headers: { "xi-api-key": this.config.apiKey },
    });

    // Set up event handlers before waiting for connection
    this.setupEventHandlers();
    console.log("Event handlers configured, waiting for connection...");

    // Wait for connection before sending configuration
    await this.waitForConnection();
    console.log("Connection established, sending stream configuration");

    // Send configuration after connection is confirmed
    this.sendStreamConfiguration();
  }

  /**
   * Sets up WebSocket event handlers
   * Each handler is focused on a single responsibility
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on("error", this.handleWebSocketError.bind(this));
    this.ws.on("close", this.handleWebSocketClose.bind(this));
    this.ws.on("message", this.handleWebSocketMessage.bind(this));
  }

  /**
   * Waits for WebSocket connection to establish
   * Returns a promise that resolves when connection is ready
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error("WebSocket not initialized"));

      this.ws.once("open", () => {
        console.log("WebSocket connection established");
        resolve();
      });
      this.ws.once("error", reject);
    });
  }

  /**
   * Sends stream configuration to ElevenLabs API
   * Uses optimized chunk settings for real-time playback
   */
  private sendStreamConfiguration(): void {
    if (!this.ws) return;

    // Create configuration with optimized chunk settings
    // For more info, see: https://elevenlabs.io/docs/api-reference/websockets
    const config: ElevenLabsConfig = {
      text: this.config.text,
      voice_settings: this.config.settings,
      generation_config: {
        // chunk_length_schedule determines when audio generation is triggered based on buffer size
        // Each number represents the minimum characters needed before generating the next audio chunk
        // [120, 160, 250, 290] means:
        // - First chunk: Wait for 120 characters
        // - Second chunk: Wait for additional 160 characters
        // - Third chunk: Wait for additional 250 characters
        // - Fourth and beyond: Wait for additional 290 characters each time
        // Lower values = faster response but potentially lower quality
        // Higher values = better quality but increased latency
        // Values should be between 50-500 characters
        chunk_length_schedule: [120, 160, 250, 290],

        // stream_chunk_size controls the size of each audio chunk sent back from the server
        // 8KB (8192 bytes) is the recommended size that balances:
        // - Network efficiency (not too many small packets)
        // - Memory usage (not too large to buffer)
        // - Playback smoothness (consistent chunk size for steady streaming)
        stream_chunk_size: 8192,
      },
    };

    console.log("Sending stream configuration:", {
      textLength: config.text.length,
      settings: config.voice_settings,
      chunkSchedule: config.generation_config.chunk_length_schedule,
    });

    // Send configuration and stream control messages
    this.ws.send(JSON.stringify(config));
    this.ws.send(JSON.stringify({ type: "bos" })); // Beginning of stream
    this.ws.send(JSON.stringify({ type: "eos" })); // End of stream marker
  }

  /**
   * Handles incoming WebSocket messages
   * Processes audio chunks and manages playback state
   */
  private async handleWebSocketMessage(data: Data): Promise<void> {
    const message = JSON.parse(data.toString()) as WSMessage;

    if (message.error === "invalid_api_key") {
      this.emit("error", new Error("Invalid API key - Please check your ElevenLabs API key in Raycast preferences"));
    }

    // Skip non-audio messages (e.g., acknowledgments)
    if (!message.audio) {
      console.log("Received non-audio message, skipping");
      return;
    }

    // Track progress for debugging and user feedback
    this.streamState.chunksReceived++;
    console.log(`Processing chunk ${this.streamState.chunksReceived} (${message.audio.length} bytes)`);

    await this.processAudioChunk(message);
  }

  /**
   * Processes individual audio chunks
   * Handles both initial playback and stream completion
   */
  private async processAudioChunk(message: WSMessage): Promise<void> {
    // Write chunk to file before attempting playback
    await this.writeAudioChunk(message.audio as string);

    // Start playback only for the first chunk
    if (!this.streamState.isPlaying) {
      console.log("First chunk received, initiating playback");
      await this.beginPlayback();
    }

    // Handle stream completion
    if (message.isFinal) {
      console.log(`Stream complete after ${this.streamState.chunksReceived} chunks`);
      this.ws?.close();
      this.emit("complete");
    }
  }

  /**
   * Writes audio chunk to temporary file
   * Uses append mode to build complete audio stream
   */
  private async writeAudioChunk(audio: string): Promise<void> {
    // Append chunk to temp file in base64 decoded form
    await fs.writeFile(this.tempFile, Buffer.from(audio, "base64"), { flag: "a" });
    console.log(`Wrote ${audio.length} bytes to temporary file`);
  }

  /**
   * Initiates audio playback
   * Marks playback as started and begins playing audio file
   */
  private async beginPlayback(): Promise<void> {
    // Update state before starting playback
    this.streamState.isPlaying = true;
    console.log("Beginning audio playback from temporary file");

    try {
      await this.playAudioFile();
      console.log("Audio playback completed successfully");
    } catch (error) {
      console.error("Playback failed:", error);
      throw error;
    }
  }

  /**
   * Plays audio file using system audio player
   * Uses afplay for macOS compatibility
   */
  private async playAudioFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use macOS native audio player for reliable playback
      // Use -r flag to control playback rate
      const validatedSpeed = validatePlaybackSpeed(this.config.playbackSpeed);
      const process = spawn("afplay", ["-r", validatedSpeed, this.tempFile]);

      // Handle process errors (e.g., afplay not found)
      process.on("error", (error) => {
        console.error("Audio player process error:", error);
        reject(error);
      });

      // Monitor process completion
      process.on("close", (code) => {
        if (code === 0) {
          console.log("Audio player process completed successfully");
          resolve();
        } else {
          console.error(`Audio player process failed with code ${code}`);
          reject(new Error(`afplay exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Waits for stream completion or error
   * Returns a promise that resolves when streaming is done
   */
  private waitForStreamCompletion(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.once("complete", resolve);
      this.once("error", reject);
    });
  }

  /**
   * Handles WebSocket errors
   * Formats error messages for user display
   */
  private handleWebSocketError(error: Error): void {
    console.error("WebSocket error:", error);
    this.emit("error", new Error(this.formatErrorMessage(error)));
  }

  /**
   * Handles WebSocket connection close
   * Ensures cleanup if playback hasn't started
   */
  private handleWebSocketClose(): void {
    console.log("WebSocket connection closed");
    if (!this.streamState.isPlaying) {
      this.cleanup().catch(console.error);
    }
  }

  /**
   * Formats error messages for user display
   * Provides friendly messages for common errors
   */
  private formatErrorMessage(error: Error): string {
    const errorMap = {
      invalid_api_key: "Invalid API key - Please check your ElevenLabs API key in preferences (⌘,)",
      ENOTFOUND: "No internet connection - Please check your network and try again",
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.message.includes(key)) return message;
    }

    return `ElevenLabs error: ${error.message}`;
  }

  /**
   * Cleans up temporary resources
   * Ensures temporary file is removed after use
   */
  private async cleanup(): Promise<void> {
    try {
      if (existsSync(this.tempFile)) await fs.unlink(this.tempFile);
      console.log("Temporary file cleaned up");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}
