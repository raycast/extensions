import fetch from 'node-fetch'
import { CreateTrelloCard } from '../constants/dictionary'

const requestP = (url: string, options = {}): Promise<any> => {
  console.log(Object.assign({}, options))
  return new Promise((res, rej) => {
    fetch(url, Object.assign({}, options))
      .then((r) => {
        if (r.ok) {
          res(r.json())
        } else {
          rej({
            msg: `系统错误:${r.status}`,
            detail: r
          })
        }
      })
      .catch((error) => {
        rej(error)
      })
  })
}

const getBoardListCards = (trelloAPIBaseUrl: string, apiKey: string, apiToken: string, boardId: string) => {
  const url = `${trelloAPIBaseUrl}/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`
  return requestP(url)
}

const createTrelloCard = (
  trelloAPIBaseUrl: string,
  apiKey: string,
  apiToken: string,
  createTrelloCard: CreateTrelloCard
) => {
  const url = `${trelloAPIBaseUrl}/cards?idList=${createTrelloCard.idList}&key=${apiKey}&token=${apiToken}`
  return requestP(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createTrelloCard)
  })
}

export const TrelloApiClient = {
  getBoardListCards,
  createTrelloCard
}
