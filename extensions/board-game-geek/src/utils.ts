import { showToast, Toast } from '@raycast/api';
import convert from 'xml-js';
import { BggSearchResponse, BggDetailsResponse, BoardGameXml, GameDetailsXml } from './models';

export async function parseResults(response: Response): Promise<BggSearchResponse> {
  const resultsArr: BggSearchResponse = [];

  try {
    const xml = await response.text();
    const obj = convert.xml2js(xml) as BoardGameXml;

    const elements = obj.elements?.[0]?.elements || [];

    elements.forEach((el) => {
      const title = el.elements.find((e) => e.name === 'name');

      if (!title) return;

      resultsArr.push({
        bggId: el.attributes.id,
        title: title.attributes.value,
        url: `https://boardgamegeek.com/boardgame/${el.attributes.id}`,
      });
    });
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, 'Could not parse response');
  }

  return resultsArr;
}

export async function parseGameData(response: Response): Promise<BggDetailsResponse> {
  const gameData: BggDetailsResponse = {};

  try {
    const xml = await response.text();

    const result = convert.xml2js(xml, { compact: true }) as GameDetailsXml;

    gameData.bggId = result?.items?.item?._attributes?.objectid;
    gameData.title = result?.items?.item.name?._text;
    gameData.img = result?.items?.item?.thumbnail?._text;
    gameData.description = result?.items?.item?.description?._text;
    gameData.minPlayers = parseInt(result?.items?.item?.minplayers?._attributes?.value);
    gameData.maxPlayers = parseInt(result?.items?.item?.maxplayers?._attributes?.value);
    gameData.avgPlaytime = parseInt(result?.items?.item?.playingtime?._attributes?.value);
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, 'Could not parse response');
  }

  return gameData;
}
