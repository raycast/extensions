import { Action, ActionPanel, Color, Icon, List, showToast, Toast, LocalStorage, useNavigation } from '@raycast/api';
import { useEffect, useState } from 'react';

import IgnoredSources from './IgnoredSources';
import { getInternetWorldLocation, InfoType } from './getWorldLocation';
import { getNews, NewsType } from './news';

type LoadingStatus = 'loading' | 'failure' | 'success';
export type Values = { key: string; label: string };
export const IGNORED = 'ignore';

function CategoryDropdown({ category, setCategory }: any) {
    return (
        <List.Dropdown
            tooltip="Select News Category"
            onChange={(newCat: string) => setCategory(newCat)}
            value={category}>
            {['All', 'Sport', 'Economy', 'Health', 'Crypto', 'Technology', 'Planet'].map((category, index) => (
                <List.Dropdown.Item key={index} title={category} value={category !== 'All' ? category : ''} />
            ))}
        </List.Dropdown>
    );
}

export default function Command() {
    const [status, setStatus] = useState<LoadingStatus>('loading');

    const { push } = useNavigation();

    const [location, setLocation] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [news, setNews] = useState<NewsType[]>([]);

    useEffect(() => {
        showToast({
            style: Toast.Style.Success,
            title: 'Your location',
            message: location,
        });
    }, [location]);

    useEffect(() => {
        getData(category);
    }, []);

    const getData = (category: string) => {
        setStatus('loading');

        getInternetWorldLocation()
            .then((info: InfoType[]) => {
                const loc: string = info
                    .reduce((acc: string[], cur: InfoType) => {
                        acc.push(cur.value);
                        return acc;
                    }, [])
                    .join(', ');
                setLocation(loc);

                return Promise.all([Promise.resolve(info), LocalStorage.allItems<Values[]>()]);
            })
            .then((results: any[]) => {
                const info: InfoType[] = results[0];
                const ignored: Values[] = results[1];

                return getNews(info, category, ignored);
            })
            .then((news: NewsType[]) => {
                setNews(news);

                setStatus('success');
            })
            .catch((err) => {
                setStatus('failure');
                showToast(err);
            });
    };

    const ignoreSource = (source: string) => {
        LocalStorage.setItem(source, IGNORED).then(() => getData(category));
    };

    const enableSources = () => {
        LocalStorage.clear().then(() => getData(category));
    };

    const handleChangeCategory = (newCategory: string) => {
        setCategory(newCategory);
        getData(newCategory);
    };

    return (
        <List
            navigationTitle="Latest News"
            searchBarPlaceholder="Search words.."
            isLoading={status === 'loading'}
            searchBarAccessory={<CategoryDropdown setCategory={handleChangeCategory} />}>
            {news.map((n, i) => (
                <List.Section key={i} title={`[${n.timeago}]: ${n.title}`}>
                    <List.Item
                        icon={{ source: Icon.Circle, tintColor: Color.Red }}
                        title={n.description}
                        subtitle={n.author}
                        detail={<List.Item.Detail isLoading={true} />}
                        actions={
                            <ActionPanel>
                                <Action.OpenInBrowser title="Read" url={n.url} />
                                <Action
                                    icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                                    title={`Ignore '${n.author}'`}
                                    onAction={() => ignoreSource(n.author)}
                                />
                                <Action
                                    icon={{ source: Icon.Clipboard, tintColor: Color.Brown }}
                                    title={`See ignored Sources`}
                                    onAction={() => push(<IgnoredSources />)}
                                />
                                <Action
                                    icon={{ source: Icon.ChevronUp, tintColor: Color.Green }}
                                    title="Enable all Sources"
                                    onAction={enableSources}
                                />
                            </ActionPanel>
                        }
                    />
                </List.Section>
            ))}
        </List>
    );
}
