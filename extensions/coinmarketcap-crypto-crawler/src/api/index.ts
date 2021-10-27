import axios from 'axios';
import { ResultData } from '../types';

type FetchParameters = {
  limit: number, 
  start: number
}
export const fetchAllCrypto = ({ limit, start }: FetchParameters) => axios.get<ResultData>('https://api.coinmarketcap.com/data-api/v3/map/all', {
  data: {
    cryptoAux: 'is_active,status',
    exchangeAux: 'is_active,status',
    limit,
    start
  }
});