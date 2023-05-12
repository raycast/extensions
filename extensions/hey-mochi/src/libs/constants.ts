export const PROMPT_PREFIX =
  "Given list of endpoints\nendpoints = [{endpoint: '/defi/chains', description: 'List all chains available', type: 'chain-info'}, {endpoint: '/defi/gas-tracker', description: 'Tracking gas fee of 4 chains: Fantom Opera, Binance Smart Chain, Ethereum, Polygon', type: 'gas-track'}, {endpoint: '/defi/trending',description: 'list of 7 trending token on the market', type: 'token-trend'}, {endpoint: '/defi/coins?query={token}', description: 'find the information of a token',  type: 'token-info'}]."
export const PROMPT_SURFIX =
  'classify the prompt with the element in list, if type is token-info then change the {token} in the endpoint to the classified token, and finally generate only a json strictly in the format: \n{\n"endpoint": "<endpoint>", \n"description": "<description>", \n"type": "<type>"\n}'
export const MOCHI_HOST = 'https://api.mochi.pod.town/api/v1'
export const COIN_QUERY_TITLE = [
  'Mochi found this list. What exactly token you want?',
  'Got so many tokens related, pick the one you need',
]
