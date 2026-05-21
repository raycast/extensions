export class MirAIeTopic {
  controlTopic: string;
  statusTopic: string;
  connectionStatusTopic: string;

  constructor(controlTopic: string, statusTopic: string, connectionStatusTopic: string) {
    this.controlTopic = controlTopic;
    this.statusTopic = statusTopic;
    this.connectionStatusTopic = connectionStatusTopic;
  }
}
