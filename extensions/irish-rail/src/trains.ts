import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';

const allowLegacyRenegotiationforNodeJsOptions = {
    httpsAgent: new https.Agent({
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    }),
  };
  
  function makeRequest(url: string) {
    return axios({
      ...allowLegacyRenegotiationforNodeJsOptions,
      url,
      headers: {
        Accept: 'application/xml',
      },
      method: 'GET',
    });
  }
  


const apiUrl = (origin: string) => `https://api.irishrail.ie/realtime/realtime.asmx/getStationDataByNameXML?StationDesc=${origin}`;

export interface Train {
    Traincode: string;
    Origin: string;
    Duein: string;
    Destination: string;
    Destinationtime: string;
}


function dueAsc(a: Train, b: Train) {
    const aDueIn = parseInt(a.Duein);
    const bDueIn = parseInt(b.Duein);
    if (aDueIn < bDueIn) return -1;
}

export async function getTrains(origin: string, destination?: string): Promise<Train[]> {
    const result = await makeRequest(apiUrl(origin));
    const body = result.data;
    const parser = new XMLParser();
    const parsedJson = parser.parse(body);
    const destinationTrains = destination ? 
        parsedJson.ArrayOfObjStationData.objStationData.filter((train: Train) => train.Destination === destination) :
        parsedJson.ArrayOfObjStationData.objStationData;

    if (!destinationTrains?.length) {
        return [];
    }

    
    return [...destinationTrains.sort(dueAsc)]
        
}
