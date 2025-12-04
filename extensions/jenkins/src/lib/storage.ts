import { LocalStorage } from "@raycast/api";
import { Jenkins } from "./api";
import { v4 as uuidv4 } from "uuid";

const JenkinsKey = "jenkins";

export const saveJenkins = async (jenkinsList: Jenkins[]) => {
  await LocalStorage.setItem(JenkinsKey, JSON.stringify(jenkinsList));
};

export const listJenkins = async (): Promise<Jenkins[]> => {
  const jenkinsList = await LocalStorage.getItem(JenkinsKey);
  return JSON.parse(jenkinsList ? jenkinsList.toString() : "[]") as Jenkins[];
};

export const deleteJenkins = async (id: string) => {
  const jenkinsList = await listJenkins();
  await saveJenkins(jenkinsList.filter((j) => j.id !== id));
};

export const addJenkins = async (jenkins: Jenkins) => {
  let jenkinsList = await listJenkins();
  if (jenkins.id) {
    jenkinsList = jenkinsList.map((j) => {
      if (j.id === jenkins.id) {
        jenkins.updateTime = new Date().getTime();
        return jenkins;
      }
      return j;
    });
  } else {
    jenkins.id = uuidv4();
    jenkins.createTime = new Date().getTime();
    jenkins.updateTime = new Date().getTime();
    jenkinsList.push(jenkins);
  }
  await saveJenkins(jenkinsList);
};
