// Logging utility
const LOG_ENABLED = false; // Set to false to disable all logging

export const log = (level: 'debug' | 'error', component: string, message: string, data?: any) => {
  if (!LOG_ENABLED) return;
  
  const timestamp = new Date().toISOString();
  const logData = {
    ...data,
    component,
    timestamp
  };

  if (level === 'debug') {
    console.debug(`[FolderSearch] ${message}:`, logData);
  } else {
    console.error(`[FolderSearch] ${message}:`, logData);
  }
}; 