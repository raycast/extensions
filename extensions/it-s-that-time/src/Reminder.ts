export default interface Reminder {
  id: string;
  timerFile: string;
  targetTimestamp: number;
  message: string;
  messageScriptFile: string;
}
