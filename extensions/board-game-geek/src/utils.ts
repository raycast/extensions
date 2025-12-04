import { showFailureToast } from '@raycast/utils';
import convert from 'xml-js';
import { BggSearchResponse, BggDetailsResponse, BoardGameXml, GameDetailsXml } from './models';

export async function parseResults(response: Response): Promise<BggSearchResponse | undefined> {
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
    showFailureToast('Could not parse response');
    return;
  }

  return resultsArr;
}

export async function parseGameData(response: Response): Promise<BggDetailsResponse> {
  let gameData: BggDetailsResponse;

  try {
    const xml = await response.text();

    const result = convert.xml2js(xml, { compact: true }) as GameDetailsXml;

    gameData = {
      bggId: result?.items?.item?._attributes?.objectid,
      title: result?.items?.item.name?._text,
      img: result?.items?.item?.thumbnail?._text,
      description: result?.items?.item?.description?._text,
      minPlayers: result?.items?.item?.minplayers?._attributes?.value
        ? parseInt(result.items.item.minplayers._attributes.value)
        : undefined,
      maxPlayers: result?.items?.item?.maxplayers?._attributes?.value
        ? parseInt(result.items.item.maxplayers._attributes.value)
        : undefined,
      avgPlaytime: result?.items?.item?.playingtime?._attributes?.value
        ? parseInt(result.items.item.playingtime._attributes.value)
        : undefined,
    };
  } catch (error) {
    showFailureToast('Could not parse response');
    throw error;
  }

  return gameData;
}
