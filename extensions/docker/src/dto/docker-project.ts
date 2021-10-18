import { Color } from "@raycast/api";
import DockerContainer from "./docker-container";

export default class DockerProject {
  ID: string;
  WorkingDir: string;
  Title: string;
  Containers: DockerContainer[];

  constructor(ID = "", WorkingDir = "", Title = "", Containers: DockerContainer[]) {
    this.ID = ID;
    this.WorkingDir = WorkingDir;
    this.Title = Title;
    this.Containers = Containers;
  }

  get IconColor(): string {
    switch (this.getState) {
      case "running":
        return Color.Green;

        break;
      case "created":
        return Color.Blue;

        break;
      case "restarting":
      case "removing":
      case "paused":
        return Color.Orange;

        break;
      default:
        return "#eee";
        break;
    }
  }

  get getContainerCount(): number {
    return this.Containers.length;
  }

  get getTitle(): string {
    return this.Title;
  }

  get getState(): string {
    const states = this.Containers.map((c) => c.State).filter(this.onlyUnique);

    return states[0];
  }

  get isRunning(): boolean {
    return this.getState === "running";
  }

  onlyUnique(value: string, index: any, self: any) {
    return self.indexOf(value) === index;
  }
}
