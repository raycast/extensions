import { faker } from "@faker-js/faker";
import { GameData, GameDataResponse, GameDataSimple, GameSimple } from "../types";

export const isFakeData = false;

export const fakeGames = (count: number) => Array.from({ length: count }, fakeGame);
const fakeGame = (): GameSimple => ({
  appid: +Math.random().toString().slice(2, 19),
  name: faker.hacker.noun(),
});

export const fakeGameDataSimpleResponse = (count: number): GameDataSimple[] =>
  Array.from({ length: count }, fakeGameDataSimple);
export const fakeGameDataSimpleMany = (count: number): GameDataSimple[] =>
  Array.from({ length: count }, fakeGameDataSimple);
export const fakeGameDataSimple = (): GameDataSimple => {
  const appid = +Math.random().toString().slice(2, 19);
  return {
    appid,
    name: faker.hacker.noun(),
    playtime_forever: Math.floor(Math.random() * 1000),
    img_icon_url: "",
  };
};

export const fakeGameDataResponse = (): GameDataResponse => {
  const appid = +Math.random().toString().slice(2, 19);
  return {
    [appid]: {
      success: true,
      data: fakeGameData(appid),
    },
  };
};
export const fakeGameData = (appid?: number): GameData => {
  return {
    type: "game",
    name: faker.hacker.noun(),
    steam_appid: appid ?? +Math.random().toString().slice(2, 19),
    required_age: Math.floor(Math.random() * 1000),
    is_free: Math.random() > 0.5,
    detailed_description: faker.lorem.paragraph(),
    about_the_game: faker.lorem.paragraph(),
    short_description: faker.lorem.paragraph(),
    supported_languages: ["en"],
    header_image: "",
    website: faker.internet.url(),
    pc_requirements: {
      minimum: faker.internet.url(),
      recommended: faker.internet.url(),
    },
    mac_requirements: {
      minimum: faker.internet.url(),
      recommended: faker.internet.url(),
    },
    linux_requirements: {
      minimum: faker.internet.url(),
      recommended: faker.internet.url(),
    },
    developers: [faker.hacker.noun()],
    publishers: [faker.hacker.noun()],
    price_overview: {
      currency: "USD",
      initial: Math.floor(Math.random() * 1000),
      final: Math.floor(Math.random() * 1000),
      discount_percent: Math.floor(Math.random() * 100),
      final_formatted: "$0.00",
    },
    metacritic: {
      score: Math.floor(Math.random() * 100),
      url: "",
    },
    categories: [
      {
        id: Math.floor(Math.random() * 1000),
        description: faker.hacker.noun(),
      },
    ],
    genres: [
      {
        id: Math.floor(Math.random() * 1000),
        description: faker.hacker.noun(),
      },
    ],
    screenshots: [
      {
        id: Math.floor(Math.random() * 1000),
        path_thumbnail: faker.internet.url(),
        path_full: faker.internet.url(),
      },
    ],
    movies: [
      {
        id: Math.floor(Math.random() * 1000),
        name: faker.hacker.noun(),
        thumbnail: faker.internet.url(),
        webm: faker.internet.url(),
        highlight: Math.random() > 0.5,
        description: faker.lorem.paragraph(),
      },
    ],
    platforms: {
      windows: Math.random() > 0.5,
      mac: Math.random() > 0.5,
      linux: Math.random() > 0.5,
    },
    background: faker.internet.url(),
    legal_notice: faker.lorem.paragraph(),
    release_date: {
      coming_soon: Math.random() > 0.5,
      date: faker.date.past().toISOString(),
    },
  };
};
