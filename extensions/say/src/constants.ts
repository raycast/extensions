export const systemDefault = "System Settings";
export const autoDetect = "Auto Detect (Offline)";
export const autoDetectWithAI = "Auto Detect (Raycast AI)";
export const isAutoDetectVoice = (voice?: string) => voice === autoDetect || voice === autoDetectWithAI;

export const defaultRate = 175;
export const minRate = 50;
export const maxRate = 300;
