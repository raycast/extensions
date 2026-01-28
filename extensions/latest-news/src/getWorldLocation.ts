import axios from 'axios';
import * as cheerio from 'cheerio';

export type InfoType = { label: string; value: string };

export const getInternetWorldLocation = (): Promise<InfoType[]> => {
    return axios.get(`https://ipaddress.my`).then(({ data }) => {
        const $ = cheerio.load(data);

        const table = $('tbody')[1];
        const infoData: InfoType[] = [];

        $('tr', table)
            .filter(function () {
                const info: string = $('td', this).first().text().toLowerCase().trim().replace(':', '');
                return ['country', 'state'].includes(info);
            })
            .each(function (index, item) {
                const label = $('td', item).first().text().toLowerCase().trim().replace(':', '');
                const value = $('td', item).last().text().trim();
                infoData.push({ label, value });
            });

        return infoData;
    });
};
