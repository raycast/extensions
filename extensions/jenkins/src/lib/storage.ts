import { LocalStorage } from "@raycast/api";
import { Jenkins } from "./api";
import { v4 as uuidv4 } from "uuid";

const JenkinsKey = "jenkins";
const FavoritesKey = "jenkins-favorites";
const FavoriteInstancesKey = "jenkins-favorite-instances";

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

// Favorites management
export interface FavoriteJob {
  jenkinsId: string;
  jobUrl: string;
  jobName: string;
  jobPath: string;
}

export const listFavorites = async (): Promise<FavoriteJob[]> => {
  const favorites = await LocalStorage.getItem(FavoritesKey);
  return JSON.parse(favorites ? favorites.toString() : "[]") as FavoriteJob[];
};

export const saveFavorites = async (favorites: FavoriteJob[]) => {
  await LocalStorage.setItem(FavoritesKey, JSON.stringify(favorites));
};

export const addFavorite = async (favorite: FavoriteJob) => {
  const favorites = await listFavorites();
  // Check if already exists
  if (!favorites.some((f) => f.jenkinsId === favorite.jenkinsId && f.jobUrl === favorite.jobUrl)) {
    favorites.push(favorite);
    await saveFavorites(favorites);
  }
};

export const removeFavorite = async (jenkinsId: string, jobUrl: string) => {
  const favorites = await listFavorites();
  await saveFavorites(favorites.filter((f) => !(f.jenkinsId === jenkinsId && f.jobUrl === jobUrl)));
};

export const isFavorite = async (jenkinsId: string, jobUrl: string): Promise<boolean> => {
  const favorites = await listFavorites();
  return favorites.some((f) => f.jenkinsId === jenkinsId && f.jobUrl === jobUrl);
};

export const listFavoriteInstances = async (): Promise<string[]> => {
  const favorites = await LocalStorage.getItem(FavoriteInstancesKey);
  return JSON.parse(favorites ? favorites.toString() : "[]") as string[];
};

export const saveFavoriteInstances = async (instanceIds: string[]) => {
  await LocalStorage.setItem(FavoriteInstancesKey, JSON.stringify(instanceIds));
};

export const addFavoriteInstance = async (instanceId: string) => {
  const favorites = await listFavoriteInstances();
  if (!favorites.includes(instanceId)) {
    favorites.push(instanceId);
    await saveFavoriteInstances(favorites);
  }
};

export const removeFavoriteInstance = async (instanceId: string) => {
  const favorites = await listFavoriteInstances();
  await saveFavoriteInstances(favorites.filter((id) => id !== instanceId));
};

export const isFavoriteInstance = async (instanceId: string): Promise<boolean> => {
  const favorites = await listFavoriteInstances();
  return favorites.includes(instanceId);
};
