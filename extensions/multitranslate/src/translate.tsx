import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { Main } from './components/Main'

const agent = new ProxyAgent({
  uri: 'http://127.0.0.1:7890',
})

setGlobalDispatcher(agent)

export default Main
