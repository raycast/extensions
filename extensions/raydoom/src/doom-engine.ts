/**
 * Doom Engine Wrapper - Adapts raydoom-core for Raycast extension
 */

import {
  loadDoomEngine,
  buildDoomArgs,
  DoomModule,
  PlayerStatus as CorePlayerStatus,
  WeaponType,
  AmmoType,
  KeyCard,
} from "raydoom-core";
import { GameConfig } from "./menu-config";
import { getWadPath } from "./utils/wad-manager";
import { getEngineAssetsPath } from "./utils/engine-manager";

// Global callback handlers for WASM to call
let currentFrameCallback: ((frame: string, width: number, height: number) => void) | null = null;
let logCallback: ((message: string) => void) | null = null;

// Key queue for buffering input
const keyQueue: number[] = [];

// Circular frame buffer to prevent unbounded memory growth (max 3 frames)
const FRAME_BUFFER_SIZE = 3;
const frameBuffer: string[] = new Array(FRAME_BUFFER_SIZE);
let frameBufferIndex = 0;
let frameBufferCount = 0;

// Register global callbacks for WASM bridge
(globalThis as Record<string, unknown>).JS_RenderASCIIFrame_Callback = (
  frame: string,
  width: number,
  height: number,
) => {
  if (currentFrameCallback) {
    // Limit frame size to prevent memory accumulation (max ~10KB per frame)
    const maxFrameSize = 10000;
    const trimmedFrame = frame.length > maxFrameSize ? frame.substring(0, maxFrameSize) : frame;

    // Store in circular buffer (overwrites oldest frame)
    frameBuffer[frameBufferIndex] = trimmedFrame;
    frameBufferIndex = (frameBufferIndex + 1) % FRAME_BUFFER_SIZE;
    if (frameBufferCount < FRAME_BUFFER_SIZE) {
      frameBufferCount++;
    }

    currentFrameCallback(trimmedFrame, width, height);
  }
};

(globalThis as Record<string, unknown>).JS_GetNextKey_Callback = () => {
  if (keyQueue.length > 0) {
    const key = keyQueue.shift();
    return key !== undefined ? key : 0;
  }
  return 0;
};

(globalThis as Record<string, unknown>).JS_Log_Callback = (message: string) => {
  if (logCallback) {
    logCallback(message);
  }
};

export type PlayerStatus = CorePlayerStatus;

/**
 * Game state interface
 */
export interface GameState {
  isInitialized: boolean;
  isRunning: boolean;
  currentFrame: string;
  lastError?: string;
}

/**
 * Doom Engine Manager
 */
export class DoomEngine {
  private module: DoomModule | null = null;
  private gameState: GameState;

  constructor() {
    this.gameState = {
      isInitialized: false,
      isRunning: false,
      currentFrame: "",
    };
  }

  /**
   * Initialize the WASM module and Doom engine
   */
  async initialize(
    onFrameUpdate: (frame: string, width: number, height: number) => void,
    onLog: (message: string) => void,
    config?: GameConfig,
  ): Promise<void> {
    if (this.gameState.isInitialized && this.module) {
      onLog("Engine already initialized");
      return;
    }

    // Check if already initializing (prevents double initialization from React)
    if (isInitializing && initializationPromise) {
      onLog("Engine initialization already in progress, returning existing promise...");
      return initializationPromise;
    }

    isInitializing = true;

    // Create and cache the initialization promise
    initializationPromise = (async () => {
      try {
        // Set up callbacks
        currentFrameCallback = onFrameUpdate;
        logCallback = onLog;

        // Check if we have a cached module
        const cached = getCachedModule();
        if (cached) {
          onLog("Using cached WASM module");
          this.module = cached;
        } else {
          onLog("Loading Doom WASM module...");

          // Build command-line arguments
          const args = buildDoomArgs(config?.episode, config?.difficulty, config?.scaling || 3);

          if (config) {
            onLog(`Starting with Episode ${config.episode}, Skill ${config.difficulty}`);
          }

          // Store args globally for use in startGame()
          commandLineArgs = args;

          // Load the engine from supportPath (WASM files downloaded by engine-manager)
          this.module = await loadDoomEngine({
            assetsPath: getEngineAssetsPath(),
            print: (text: string) => onLog(`[DOOM] ${text}`),
            printErr: (text: string) => onLog(`[DOOM ERROR] ${text}`),
            arguments: args,
            noInitialRun: true,
          });

          // Load WAD file into Emscripten virtual filesystem
          const wadPath = getWadPath();
          onLog(`Loading WAD from ${wadPath} into virtual filesystem...`);

          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = require("fs");
          const wadData = fs.readFileSync(wadPath);

          // Write WAD file to Emscripten virtual filesystem (DOOM looks in current directory)
          if (this.module.FS) {
            // Write the WAD file to root of virtual filesystem
            this.module.FS.writeFile("/doom1.wad", wadData);
            onLog(`WAD file loaded into virtual filesystem (${wadData.length} bytes)`);
          } else {
            throw new Error("Emscripten FS not available");
          }

          // Store module reference after it's loaded
          setCachedModule(this.module);
        }

        onLog("Doom module loaded successfully");

        // Initialize game after module is fully loaded
        onLog("WASM runtime initialized");
        this.initializeGame();
        setInitializing(false);
      } catch (error) {
        setInitializing(false);
        initializationPromise = null;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.gameState.lastError = errorMessage;
        onLog(`Failed to initialize Doom: ${errorMessage}`);
        throw error;
      }
    })();

    return initializationPromise;
  }

  /**
   * Initialize the Doom game
   */
  private initializeGame(): void {
    if (!this.module) {
      throw new Error("Module not loaded");
    }

    try {
      // Call DG_Init
      if (this.module._DG_Init) {
        this.module._DG_Init();
      }

      this.gameState.isInitialized = true;

      if (logCallback) {
        logCallback("Doom game initialized");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.gameState.lastError = errorMessage;
      if (logCallback) {
        logCallback(`Failed to initialize game: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Start the game loop
   */
  startGame(): void {
    if (!this.module || !this.gameState.isInitialized) {
      if (logCallback) logCallback("Cannot start game - not initialized");
      return;
    }

    if (this.gameState.isRunning) {
      if (logCallback) logCallback("Game already running, skipping start");
      return;
    }

    // Mark as running IMMEDIATELY to prevent race conditions
    this.gameState.isRunning = true;

    if (logCallback) logCallback("Starting game loop...");

    // Start game loop via callMain
    if (this.module.callMain) {
      // Global check to ensure callMain() is NEVER called more than once
      if (mainLoopStarted) {
        if (logCallback) logCallback("Main loop already started globally, aborting");
        return;
      }

      mainLoopStarted = true;

      // Run main in next tick to avoid blocking
      setImmediate(() => {
        try {
          // Use callMain() which properly sets up argc/argv before calling main()
          this.module?.callMain(commandLineArgs);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (logCallback) logCallback(`Game loop error: ${errorMessage}`);
          mainLoopStarted = false; // Reset on error
        }
      });
    } else if (logCallback) {
      logCallback("ERROR: callMain not available on module!");
    }
  }

  /**
   * Queue a key press for the game
   */
  queueKey(keycode: number): void {
    if (!this.module || !this.gameState.isInitialized) {
      return;
    }

    // Add to the key queue that JS_GetNextKey_Callback reads from
    keyQueue.push(keycode);

    // Also call WASM function directly if available
    if (this.module._WASM_QueueKey) {
      try {
        this.module._WASM_QueueKey(keycode);
      } catch (error) {
        if (logCallback) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logCallback(`Error queuing key: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Get current game state
   */
  getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  /**
   * Get current player status (for menu bar display)
   */
  getPlayerStatus(): PlayerStatus | null {
    if (!this.module || !this.gameState.isInitialized) {
      return null;
    }

    try {
      const health = this.module._WASM_GetPlayerHealth();
      const armor = this.module._WASM_GetPlayerArmor();
      const weapon = this.module._WASM_GetPlayerWeapon() as WeaponType;
      const weaponAmmo = this.module._WASM_GetCurrentWeaponAmmo();

      return {
        health,
        armor,
        weapon,
        weaponAmmo,
        ammo: {
          bullets: this.module._WASM_GetPlayerAmmo(AmmoType.CLIP),
          shells: this.module._WASM_GetPlayerAmmo(AmmoType.SHELL),
          cells: this.module._WASM_GetPlayerAmmo(AmmoType.CELL),
          rockets: this.module._WASM_GetPlayerAmmo(AmmoType.ROCKET),
        },
        maxAmmo: {
          bullets: this.module._WASM_GetPlayerMaxAmmo(AmmoType.CLIP),
          shells: this.module._WASM_GetPlayerMaxAmmo(AmmoType.SHELL),
          cells: this.module._WASM_GetPlayerMaxAmmo(AmmoType.CELL),
          rockets: this.module._WASM_GetPlayerMaxAmmo(AmmoType.ROCKET),
        },
        keys: {
          blueCard: this.module._WASM_GetPlayerHasKey(KeyCard.BLUE_CARD) === 1,
          yellowCard: this.module._WASM_GetPlayerHasKey(KeyCard.YELLOW_CARD) === 1,
          redCard: this.module._WASM_GetPlayerHasKey(KeyCard.RED_CARD) === 1,
          blueSkull: this.module._WASM_GetPlayerHasKey(KeyCard.BLUE_SKULL) === 1,
          yellowSkull: this.module._WASM_GetPlayerHasKey(KeyCard.YELLOW_SKULL) === 1,
          redSkull: this.module._WASM_GetPlayerHasKey(KeyCard.RED_SKULL) === 1,
        },
        stats: {
          kills: this.module._WASM_GetPlayerKills(),
          items: this.module._WASM_GetPlayerItems(),
          secrets: this.module._WASM_GetPlayerSecrets(),
        },
      };
    } catch (error) {
      if (logCallback) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logCallback(`Error getting player status: ${errorMessage}`);
      }
      return null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // NEW: Stop the WASM game loop FIRST
    if (this.module?._WASM_StopGameLoop) {
      try {
        this.module._WASM_StopGameLoop();
        if (logCallback) {
          logCallback("WASM game loop stopped");
        }
      } catch (error) {
        if (logCallback) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logCallback(`Error stopping game loop: ${errorMessage}`);
        }
      }
    }

    // THEN: Clear callbacks and references
    currentFrameCallback = null;
    logCallback = null;
    this.module = null;

    this.gameState.currentFrame = "";
    this.gameState.lastError = undefined;
    this.gameState.isInitialized = false;
    this.gameState.isRunning = false;

    // Clear key queue
    keyQueue.length = 0;

    // Clear circular frame buffer
    frameBuffer.fill("");
    frameBufferIndex = 0;
    frameBufferCount = 0;

    // Reset main loop flag
    mainLoopStarted = false;
  }
}

// Export singleton instance
let engineInstance: DoomEngine | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let cachedModule: DoomModule | null = null;
let mainLoopStarted = false;
let commandLineArgs: string[] = [];

export function getDoomEngine(): DoomEngine {
  if (!engineInstance) {
    engineInstance = new DoomEngine();
  }
  return engineInstance;
}

export function getCachedModule(): DoomModule | null {
  return cachedModule;
}

export function setCachedModule(module: DoomModule | null): void {
  cachedModule = module;
}

export function cleanupDoomEngine(force: boolean = false): void {
  // Don't cleanup if we're in the middle of initializing (unless forced)
  if (isInitializing && !force) {
    if (logCallback) {
      logCallback("Skipping cleanup - initialization in progress");
    }
    return;
  }

  // Reset initializing flag if forcing cleanup
  if (force) {
    isInitializing = false;
    initializationPromise = null;
  }

  if (engineInstance) {
    engineInstance.cleanup();
    engineInstance = null;
  }

  // Clear cached module
  setCachedModule(null);
}

export function setInitializing(value: boolean): void {
  isInitializing = value;
}
