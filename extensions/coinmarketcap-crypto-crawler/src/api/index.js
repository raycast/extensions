import  axios  from 'axios';


export const fetchAllCrypto = ({limit, start})=> axios({
    method: 'get',
    url: 'https://api.coinmarketcap.com/data-api/v3/map/all',
    data: {
      cryptoAux: 'is_active,status',
      exchangeAux: 'is_active,status',
      limit, 
      start
    }
  });