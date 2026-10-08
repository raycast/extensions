import { MJOptions } from "midjourney";
import { createContext, useContext } from "react";
import { useGenerationList } from "../hooks/useGenerationList";
import { client } from "../lib/client";
import { Generation } from "../types";

export interface GenerationContextType {
  generations: Generation[];
  addGeneration: (newGeneration: Generation) => Generation;
  updateGeneration: (gen: Generation, genData: Partial<Generation>) => void;
  removeGeneration: (gen: Generation) => void;
  createGeneration: (
    prompt: string,
    onGenerationCreated?: ((gen: Generation) => void) | undefined
  ) => Promise<{
    success: boolean;
  }>;
  createVariation: (
    gen: Generation,
    target: 1 | 2 | 3 | 4,
    onGenerationCreated: (gen: Generation) => void
  ) => Promise<Generation | null>;
  createVary: (
    gen: Generation,
    options: MJOptions,
    onGenerationCreated: (gen: Generation) => void
  ) => Promise<Generation | null>;
  createUpscale: (
    gen: Generation,
    target: 1 | 2 | 3 | 4,
    onGenerationCreated: (gen: Generation) => void
  ) => Promise<Generation | null>;
  createZoomOut: (
    gen: Generation,
    zoomStrength: number,
    options: MJOptions,
    onGenerationCreated: (gen: Generation) => void
  ) => Promise<Generation | null>;
}

const GenerationContext = createContext({} as GenerationContextType);

export function useGenerationContext() {
  return useContext(GenerationContext);
}

export function GenerationContextProvider({ children }: { children: React.ReactNode; defaultSelectedIndex?: number }) {
  const { generations, addGeneration, updateGeneration, removeGeneration } = useGenerationList();

  const createZoomOut = async (
    gen: Generation,
    zoomStrength: number,
    options: MJOptions,
    onGenerationCreated: (gen: Generation) => void
  ) => {
    if (!gen.id || !gen.hash) return null;

    const newGen = addGeneration({ ...gen, type: "image", command: "upscale" });
    onGenerationCreated(newGen);

    const zoomOut = await client.Custom({
      msgId: gen.id,
      flags: gen.flags || 0,
      content: `${gen.prompt} --zoom ${zoomStrength}`,
      customId: options.custom,
      loading: (uri: string, progress: string) => {
        updateGeneration(newGen, { uri, progress });
      },
    });
    if (zoomOut) {
      updateGeneration(newGen, zoomOut);
    }

    return newGen;
  };

  const createVariation = async (
    gen: Generation,
    target: 1 | 2 | 3 | 4,
    onGenerationCreated: (gen: Generation) => void
  ) => {
    if (!gen.id || !gen.hash) return null;

    const newGen = addGeneration({ ...gen, type: "image", command: "variation" });
    onGenerationCreated(newGen);

    const variation = await client.Variation({
      index: target,
      msgId: gen.id,
      hash: gen.hash,
      flags: gen.flags || 0,
      content: gen.content,
      loading: (uri: string, progress: string) => {
        updateGeneration(newGen, { uri, progress });
      },
    });
    if (variation) {
      updateGeneration(newGen, variation);
    }
    return newGen;
  };

  const createVary = async (gen: Generation, options: MJOptions, onGenerationCreated: (gen: Generation) => void) => {
    if (!gen.id || !gen.hash) return null;

    const newGen = addGeneration({ ...gen, type: "image", command: "vary" });
    onGenerationCreated(newGen);

    const vary = await client.Custom({
      msgId: gen.id,
      flags: gen.flags || 0,
      customId: options.custom,
      content: gen.prompt,
      loading: (uri: string, progress: string) => {
        updateGeneration(newGen, { uri, progress });
      },
    });
    if (vary) {
      updateGeneration(newGen, vary);
    }

    return newGen;
  };

  const createUpscale = async (
    gen: Generation,
    target: 1 | 2 | 3 | 4,
    onGenerationCreated: (gen: Generation) => void
  ) => {
    if (!gen.id || !gen.hash) return null;

    const newGen = addGeneration({ ...gen, type: "upscale", command: "upscale" });
    onGenerationCreated(newGen);

    await client.init();

    const upscale = await client.Upscale({
      index: target,
      msgId: gen.id,
      hash: gen.hash,
      flags: gen.flags || 0,
      content: gen.content,
      loading: (uri: string, progress: string) => {
        updateGeneration(newGen, { uri, progress });
      },
    });
    if (upscale) {
      updateGeneration(newGen, upscale);
    }

    return newGen;
  };

  const createGeneration = async (prompt: string, onGenerationCreated?: (gen: Generation) => void) => {
    if (!prompt || prompt.length === 0) return { success: false };

    const newGen = addGeneration({ prompt, type: "image", command: "imagine" });
    onGenerationCreated?.(newGen);

    try {
      const msg = await client.Imagine(prompt, (uri: string, progress: string) => {
        updateGeneration(newGen, { uri, progress });
      });
      if (msg) {
        updateGeneration(newGen, msg);
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      updateGeneration(newGen, { progress: "Failed" });
      return { success: false };
    }
  };

  return (
    <GenerationContext.Provider
      value={{
        generations,
        addGeneration,
        updateGeneration,
        removeGeneration,
        createGeneration,
        createVariation,
        createVary,
        createUpscale,
        createZoomOut,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
