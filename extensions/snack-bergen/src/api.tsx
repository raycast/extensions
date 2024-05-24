import fetch from "node-fetch";

interface ApiData {
    id: string;
    title: string;
    subtitle: string;
    imagePath: string;
    pricePerUnit: number;
  }
  
export const fetchData = async (searchText, page, pageSize) => {
  const response = await fetch(`https://api.ngdata.no/sylinder/search/productsearch/v1/search/7080001150488/products?search=${searchText}&chainId=1300&pageSize=${pageSize}&page=${page + 1}&showNotForSale=true&popularity=true`, {
    headers: {
      "Host": "api.ngdata.no",
      "fwc-browser-platform": "MacIntel",
      "fwc-using-bearer-token": "false",
      "Accept": "*/*",
      "fwc-using-api-key": "false",
      "Sec-Fetch-Site": "cross-site",
      "Accept-Language": "nb-NO,nb;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Fetch-Mode": "cors",
      "Content-Type": "application/json",
      "Origin": "https://meny.no",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
      "Referer": "https://meny.no/",
      "fwc-chain-id": "1300",
      "Connection": "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
    },
  });
  return await response.json();
};

export const transformData = (data, searchText, page, pageSize) => {
  const transformedData = data.hits.map((hit, index) => ({
    index: index,
    page: page,
    text: searchText,
    id: hit.id,
    title: hit.title,
    subtitle: hit.subtitle,
    unit: hit.unit,
    isOutOfStock: hit.isOutOfStock,
    imagePath: hit.imagePath,
    pricePerUnit: hit.pricePerUnit,
    slugifiedUrl: hit.slugifiedUrl
  }));
  const hasMore = pageSize * (page + 1) < data.total;
  return { data: transformedData, hasMore };
};