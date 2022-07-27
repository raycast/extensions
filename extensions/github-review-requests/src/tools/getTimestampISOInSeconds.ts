export const getTimestampISOInSeconds = () => new Date().toISOString().substring(0, 19) + "Z";
