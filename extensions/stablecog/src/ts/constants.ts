export const loadingGif = "stars-512.gif";

export const defaultGridColumns = 4;
export const defaultGridColumnsForImagine = 2;

export const itemsPerPage = 100;
export const scoreThreshold = 50;

export const maxPromptLength = 500;

export const modelIdToName = {
  "0a99668b-45bd-4f7e-aa9c-f9aaa41ef13b": "FLUX.1",
  "986d447d-c38b-4218-a2c8-6e0b691f47ec": "Stable Diffusion 3",
  "b6c1372f-31a7-457c-907c-d292a6ffef97": "Luna Diffusion",
  "048b4aa3-5586-47ed-900f-f4341c96bdb2": "Stable Diffusion v1.5",
  "fc06f6ab-ed14-4186-a7c0-aaec288d4f38": "22h Diffusion",
  "f7f3d973-ac6f-4a7a-9db8-e89e4fba03a9": "Waifu Diffusion",
  "8acfe4c8-751d-4aa6-8c3c-844e3ef478e0": "Openjourney",
  "eaa438e1-dbf9-48fd-be71-206f0f257617": "Redshift Diffusion",
  "36d9d835-646f-4fc7-b9fe-98654464bf8e": "Arcane Diffusion",
  "8002bc51-7260-468f-8840-cf1e6dbe3f8a": "SDXL",
  "22b0857d-7edc-4d00-9cd9-45aa509db093": "Kandinsky",
  "9fa49c00-109d-430f-9ddd-449f02e2c71a": "Kandinsky 2.2",
  "3fb1f6d9-c0d3-4ae4-adf4-77f8da78a6f7": "Waifu Diffusion XL",
  "48a7031d-43b6-4a23-9f8c-8020eb6862e4": "Ghibli Diffusion",
  "4e54440f-ee17-4712-b4b6-0671b94d685d": "SSD-1B",
} as const;

export type TModelId = keyof typeof modelIdToName;
export type TModelName = (typeof modelIdToName)[TModelId];

export const modelNameToId = {} as Record<TModelName, TModelId>;

for (const [id, name] of Object.entries(modelIdToName)) {
  modelNameToId[name] = id as TModelId;
}

export const aspectRatioToSize = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 832, height: 1248 },
  "3:2": { width: 1248, height: 832 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:5": { width: 896, height: 1120 },
} as const;

export const numOutputOptions = ["1", "2", "4"] as const;

export type TAspectRatio = keyof typeof aspectRatioToSize;
export type TNumOutputs = (typeof numOutputOptions)[number];

export const models: TModelId[] = ["9fa49c00-109d-430f-9ddd-449f02e2c71a", "8002bc51-7260-468f-8840-cf1e6dbe3f8a"];
export const aspectRatios: TAspectRatio[] = ["1:1", "2:3", "3:2", "16:9", "9:16", "4:5"];
export const numOutputs: TNumOutputs[] = ["1", "2", "4"];
