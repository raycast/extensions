export type ImageGenerationModel = Preferences.Image["model"];

export type GeneratedImage = {
  id: string;
  url: string;
  config: {
    cfg_scale: number;
    height: string;
    width: string;
    steps: number;
    engine: ImageGenerationModel;
    prompt: string;
  };
  created_on: string;
  favourite: boolean;
};
