import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoType } from './getWorldLocation';
import { Values } from './index';

export type NewsType = {
    title: string;
    description: string;
    author: string;
    timeago: string;
    url: string;
    timeCount: number;
};

const URLBING = 'https://www.bing.com/news/search?q=[search]';

export const getNews = (info: InfoType[], category: string, ignored: Values[]): Promise<NewsType[]> => {
    const location = info
        .reduce((acc: string[], cur: InfoType) => {
            acc.push(cur.value);
            return acc;
        }, [])
        .join('+');

    const searchStr = `${location}${category ? '+' + category : ''}`;

    return axios.get(URLBING.replace('[search]', searchStr)).then(({ data }) => {
        try {
            const $ = cheerio.load(data);
            const news: NewsType[] = [];

            $('.news-card').each(function (index, newscard) {
                const title = $('a[class=title]', newscard).text();
                const description = $('div[class=snippet]', newscard).text();
                const author = $('div[class=source] a', newscard).text();
                const timeago = $('div[class=source] span', newscard).last().text();
                const url = $(newscard).attr('url') ?? '';

                if (!Object.keys(ignored).includes(author)) {
                    news.push({ title, description, author, timeago, url, timeCount: 0 });
                }
            });

            try {
                groupAndOrderNews(news);
            } catch (err) {
                // continue regardless of error
            }

            return news;
        } catch (err) {
            return [
                {
                    title: 'Sorry, couldn´t get any data',
                    description: 'No Data',
                    author: '',
                    timeago: '',
                    url: '',
                    timeCount: 0,
                },
            ];
        }
    });
};

const groupAndOrderNews = (news: NewsType[]) => {
    const rgx = /^(\d{1,2}) ([m|h|d]*)$/;
    news.forEach((n: NewsType) => {
        const match = n.timeago.match(rgx);
        const nb = Number(match![1]);
        const qt: string = match![2][0]; //can have more than one letter
        let multiplier = 1;
        switch (qt) {
            case 'm':
                multiplier = 1;
                break;
            case 'h':
                multiplier = 60; //min in hour
                break;
            case 'd':
                multiplier = 1440; //min in days
                break;
            default:
                multiplier = 100000;
        }
        n.timeCount = nb * multiplier;
    });
    news.sort((a, b) => a.timeCount - b.timeCount);
};
