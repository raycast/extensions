import { spawn } from 'child_process';
import { FFmpegConfig, HlsServerConfig, StreamStatus } from '../../types';
import { environment } from '@raycast/api';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { showToast, Toast } from '@raycast/api';
import { createReadStream } from 'fs';
import { readdirSync } from 'fs';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import FastifyCors from '@fastify/cors';
import FastifyStatic from '@fastify/static';

const DEFAULT_FFMPEG_CONFIG: FFmpegConfig = {
  rtspTransport: 'tcp',
  reconnectOptions: {
    attempts: 3,
    delay: 1000,
    maxDelay: 10000
  },
  hlsOptions: {
    segmentDuration: 4,
    listSize: 5,
    flags: ['delete_segments', 'append_list', 'omit_endlist', 'discont_start', 'program_date_time'],
    outputDir: join(environment.supportPath, 'streams')
  }
};

const DEFAULT_HLS_CONFIG: HlsServerConfig = {
  port: 8080,
  host: 'localhost',
  outputDir: DEFAULT_FFMPEG_CONFIG.hlsOptions.outputDir
};

const FFMPEG_PATH = '/opt/homebrew/bin/ffmpeg';

export class RtspStreamService {
  private static instance: RtspStreamService;
  private activeStreams: Map<string, { process: any; status: StreamStatus }>;
  private hlsServer: ReturnType<typeof Fastify> | null;
  private ffmpegConfig: FFmpegConfig;
  private hlsConfig: HlsServerConfig;
  private isServerStarting: boolean = false;
  private serverStartTime: number = 0;

  private constructor() {
    this.activeStreams = new Map();
    this.ffmpegConfig = DEFAULT_FFMPEG_CONFIG;
    this.hlsConfig = DEFAULT_HLS_CONFIG;
    this.hlsServer = null;

    // Ensure output directory exists
    if (!existsSync(this.ffmpegConfig.hlsOptions.outputDir)) {
      mkdirSync(this.ffmpegConfig.hlsOptions.outputDir, { recursive: true });
    }

    // Clean up any existing streams directory
    this.cleanupStreamsDirectory();

    // Handle process exit
    process.on('exit', () => {
      console.log('Process exit detected, cleaning up...');
      this.cleanup();
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      console.log('SIGINT detected, cleaning up...');
      this.cleanup().then(() => process.exit(0));
    });
  }

  public static getInstance(): RtspStreamService {
    if (!RtspStreamService.instance) {
      RtspStreamService.instance = new RtspStreamService();
    }
    return RtspStreamService.instance;
  }

  private cleanupStreamsDirectory() {
    const outputDir = this.ffmpegConfig.hlsOptions.outputDir;
    if (existsSync(outputDir)) {
      console.log('Cleaning up existing streams directory:', outputDir);
      try {
        rmSync(outputDir, { recursive: true, force: true });
        mkdirSync(outputDir, { recursive: true });
        console.log('Streams directory cleaned and recreated');
      } catch (error) {
        console.error('Error cleaning up streams directory:', error);
      }
    }
  }

  public get serverConfig(): HlsServerConfig {
    return this.hlsConfig;
  }

  private logServerState(context: string) {
    console.log('Server State:', {
      context,
      hasServer: !!this.hlsServer,
      isStarting: this.isServerStarting,
      uptime: this.serverStartTime ? Math.floor((Date.now() - this.serverStartTime) / 1000) : 0,
      activeStreams: this.activeStreams.size,
      streamIds: Array.from(this.activeStreams.keys())
    });
  }

  private buildFfmpegCommand(rtspUrl: string, deviceId: string): string[] {
    const outputDir = join(this.ffmpegConfig.hlsOptions.outputDir, deviceId);
    console.log('Setting up FFmpeg output directory:', {
      outputDir,
      exists: existsSync(outputDir)
    });

    // Ensure parent directory exists
    if (!existsSync(this.ffmpegConfig.hlsOptions.outputDir)) {
      console.log('Creating parent output directory:', this.ffmpegConfig.hlsOptions.outputDir);
      mkdirSync(this.ffmpegConfig.hlsOptions.outputDir, { recursive: true, mode: 0o755 });
    }

    // Ensure device directory exists
    if (!existsSync(outputDir)) {
      console.log('Creating device output directory:', outputDir);
      mkdirSync(outputDir, { recursive: true, mode: 0o755 });
    }

    // Verify directories after creation
    console.log('Directory status after creation:', {
      parentDir: {
        exists: existsSync(this.ffmpegConfig.hlsOptions.outputDir),
        path: this.ffmpegConfig.hlsOptions.outputDir
      },
      outputDir: {
        exists: existsSync(outputDir),
        path: outputDir
      }
    });

    // Clean any existing files
    if (existsSync(outputDir)) {
      console.log('Cleaning existing files in:', outputDir);
      const files = readdirSync(outputDir);
      for (const file of files) {
        const filePath = join(outputDir, file);
        console.log('Removing file:', filePath);
        rmSync(filePath, { force: true });
      }
    }

    const segmentPath = join(outputDir, 'segment_%03d.ts');
    const playlistPath = join(outputDir, 'playlist.m3u8');

    console.log('FFmpeg output paths:', {
      segments: segmentPath,
      playlist: playlistPath
    });

    return [
      '-hide_banner',
      '-loglevel', 'debug',
      '-stats',
      '-nostdin',
      '-fflags', '+genpts+igndts',
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-probesize', '32',
      '-analyzeduration', '0',
      '-protocol_whitelist', 'file,crypto,tcp,udp,tls,rtsp,rtsps,http,https',
      '-rtsp_flags', 'prefer_tcp',
      '-allowed_media_types', 'video+audio',
      '-max_delay', '5000000',
      '-user_agent', 'Nest/1.0',
      '-i', rtspUrl,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-c:a', 'aac',
      '-ac', '2',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list+omit_endlist+program_date_time',
      '-hls_segment_type', 'mpegts',
      '-start_number', '0',
      '-hls_segment_filename', segmentPath,
      playlistPath
    ];
  }

  private async startHlsServer(): Promise<void> {
    this.logServerState('startHlsServer called');

    // If server is starting, wait for it
    if (this.isServerStarting) {
      console.log('Server is already starting, waiting...');
      let waitTime = 0;
      const maxWaitTime = 10000; // 10 seconds max wait
      
      while (this.isServerStarting && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
      
      if (this.isServerStarting) {
        console.error('Server startup timed out');
        this.isServerStarting = false;
        throw new Error('Server startup timed out');
      }
      return;
    }

    const startServer = async (): Promise<void> => {
      if (this.hlsServer) {
        try {
          await this.hlsServer.inject({
            method: 'GET',
            url: '/health'
          });
          console.log('HLS server is already running and responding');
          return;
        } catch (error) {
          console.log('HLS server instance exists but is not responding, cleaning up...');
          try {
            await this.hlsServer.close();
            console.log('Closed unresponsive server');
          } catch (closeError) {
            console.error('Error closing unresponsive server:', closeError);
          }
          this.hlsServer = null;
        }
      }

      this.isServerStarting = true;

      try {
        // Kill any existing process on port 8080
        try {
          const { exec } = require('child_process');
          exec('lsof -ti:8080 | xargs kill -9', (error: any) => {
            if (error) {
              console.log('No process found on port 8080');
            } else {
              console.log('Killed existing process on port 8080');
            }
          });
        } catch (error) {
          console.log('Error checking port 8080:', error);
        }

        console.log('Starting HLS server with config:', {
          port: this.hlsConfig.port,
          host: this.hlsConfig.host,
          outputDir: this.hlsConfig.outputDir
        });

        // Create fastify instance
        this.hlsServer = Fastify({
          logger: true,
          keepAliveTimeout: 60000,
          connectionTimeout: 65000
        });

        // Register CORS plugin
        await this.hlsServer.register(FastifyCors, {
          origin: '*',
          methods: ['GET', 'OPTIONS'],
          allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
        });

        // Add health check route first
        this.hlsServer.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
          this.logServerState('health check');
          return 'OK';
        });

        // Add custom handler for m3u8 and ts files before static plugin
        this.hlsServer.get('/:deviceId/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
          const params = request.params as { deviceId: string; filename: string };
          if (params.filename.endsWith('.m3u8') || params.filename.endsWith('.ts')) {
            const filePath = join(this.hlsConfig.outputDir, params.deviceId, params.filename);

            console.log('Serving media file:', {
              params,
              filePath,
              exists: existsSync(filePath),
              outputDir: this.hlsConfig.outputDir,
              serverUptime: Math.floor((Date.now() - this.serverStartTime) / 1000)
            });

            if (!existsSync(filePath)) {
              console.error('File not found:', {
                filePath,
                outputDir: this.hlsConfig.outputDir,
                params
              });
              reply.code(404).send('File not found');
              return;
            }

            // Set appropriate headers
            reply.headers({
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Content-Type': params.filename.endsWith('.m3u8')
                ? 'application/vnd.apple.mpegurl'
                : 'video/MP2T'
            });

            // Stream the file
            return reply.send(createReadStream(filePath));
          }
        });

        // Register static file serving plugin last
        await this.hlsServer.register(FastifyStatic, {
          root: this.hlsConfig.outputDir,
          prefix: '/',
          cacheControl: false,
          lastModified: false,
          decorateReply: false // Prevent conflicts with existing decorators
        });

        // Start listening
        await this.hlsServer.listen({
          port: this.hlsConfig.port,
          host: this.hlsConfig.host
        });

        this.serverStartTime = Date.now();
        console.log(`HLS server running at http://${this.hlsConfig.host}:${this.hlsConfig.port}`);
      } catch (error) {
        console.error('Failed to start HLS server:', error);
        this.isServerStarting = false;
        throw error;
      }
    };

    // Start server with retries
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        await startServer();
        this.logServerState('server started successfully');
        this.isServerStarting = false;
        return;
      } catch (error) {
        retries++;
        console.error(`Server start attempt ${retries} failed:`, error);
        if (retries < maxRetries) {
          console.log(`Retrying in ${retries * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, retries * 1000));
        }
      }
    }

    this.isServerStarting = false;
    throw new Error(`Failed to start HLS server after ${maxRetries} attempts`);
  }

  public async startStream(deviceId: string, rtspUrl: string): Promise<StreamStatus> {
    console.log('Starting stream for device:', deviceId);
    
    // Clean up any existing stream for this device
    await this.stopStream(deviceId);

    // Start HLS server if not running
    await this.startHlsServer();

    return new Promise((resolve, reject) => {
      const ffmpegArgs = this.buildFfmpegCommand(rtspUrl, deviceId);
      console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));
      
      const process = spawn(FFMPEG_PATH, ffmpegArgs);
      
      const status: StreamStatus = {
        isActive: true,
        pid: process.pid,
        url: `http://${this.hlsConfig.host}:${this.hlsConfig.port}/${deviceId}/playlist.m3u8`
      };

      let segmentCount = 0;
      let lastError = '';
      let hasFirstSegment = false;

      process.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg [${deviceId}]:`, output);
        
        // Track segment creation
        if (output.includes('segment_')) {
          segmentCount++;
          console.log(`Created segment #${segmentCount} for device ${deviceId}`);
          
          // Resolve after first segment is created
          if (!hasFirstSegment) {
            hasFirstSegment = true;
            // Update status object with additional info
            status.segmentCount = segmentCount;
            status.lastError = lastError;
            
            this.activeStreams.set(deviceId, { process, status });
            resolve(status);
          }
        }

        // Track errors
        if (output.includes('Error') || output.includes('error')) {
          lastError = output;
          console.error(`FFmpeg error [${deviceId}]:`, output);
        }
      });

      process.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout [${deviceId}]:`, data.toString());
      });

      process.on('error', (error) => {
        console.error(`FFmpeg process error [${deviceId}]:`, error);
        status.error = error;
        status.isActive = false;
        showToast({
          style: Toast.Style.Failure,
          title: "FFmpeg Error",
          message: `Failed to start stream: ${error.message}`,
        });
        reject(error);
      });

      process.on('exit', (code, signal) => {
        console.log(`FFmpeg process exited [${deviceId}]:`, {
          code,
          signal,
          command: ffmpegArgs.join(' ')
        });
        status.isActive = false;
        if (code !== 0) {
          status.error = new Error(`FFmpeg exited with code ${code}`);
          showToast({
            style: Toast.Style.Failure,
            title: "Stream Ended Unexpectedly",
            message: `FFmpeg exited with code ${code}`,
          });
        }

        // Only resolve here if we haven't already resolved
        if (!hasFirstSegment) {
          // Update status object with additional info
          status.segmentCount = segmentCount;
          status.lastError = lastError;
          
          this.activeStreams.set(deviceId, { process, status });
          resolve(status);
        }
      });

      // Add a timeout to reject if no segments are created
      setTimeout(() => {
        if (!hasFirstSegment) {
          const error = new Error('Timeout waiting for first segment');
          status.error = error;
          status.isActive = false;
          reject(error);
        }
      }, 10000); // 10 second timeout
    });
  }

  public async stopStream(deviceId: string): Promise<void> {
    const stream = this.activeStreams.get(deviceId);
    if (stream) {
      stream.process.kill('SIGTERM');
      this.activeStreams.delete(deviceId);
      
      // Clean up stream directory
      const streamDir = join(this.ffmpegConfig.hlsOptions.outputDir, deviceId);
      if (existsSync(streamDir)) {
        rmSync(streamDir, { recursive: true, force: true });
      }
    }
  }

  public getStreamStatus(deviceId: string): StreamStatus {
    const stream = this.activeStreams.get(deviceId);
    return stream?.status || { isActive: false };
  }

  public async cleanup(): Promise<void> {
    console.log('Starting cleanup...');
    
    // Stop all active streams
    for (const [deviceId] of this.activeStreams) {
      try {
        await this.stopStream(deviceId);
      } catch (error) {
        console.error(`Error stopping stream ${deviceId}:`, error);
      }
    }

    // Stop HLS server
    if (this.hlsServer) {
      console.log('Closing HLS server...');
      try {
        await this.hlsServer.close();
        console.log('HLS server closed');
        this.hlsServer = null;
      } catch (error) {
        console.error('Error closing HLS server:', error);
      }
    }

    // Reset server state
    this.isServerStarting = false;
    this.serverStartTime = 0;

    // Clean up streams directory
    this.cleanupStreamsDirectory();
  }
}
