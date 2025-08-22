// src/services/sodium-loader.ts
import sodium from "libsodium-wrappers-sumo";

// This is the promise that resolves when the WebAssembly module is ready.
// We will await this in all our crypto functions.
export const sodiumReady = sodium.ready;
