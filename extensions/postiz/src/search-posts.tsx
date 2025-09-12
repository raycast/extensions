import { List } from "@raycast/api";
import { useMemo } from "react";
import { getISOWeek } from "date-fns";
import { useFetch } from "@raycast/utils";
import { buildPostizUrl, POSTIZ_HEADERS } from "./postiz";

type Post = {
    id: string;
    content: string;
}
export default function SearchPosts() {
    // const {isLoading, data: posts} = useCachedPromise(async () => {
    //     const data = await postiz.postList({ startDate: '2025-09-01', endDate: '2025-09-11', customer: "" });
    //     console.log(data)
    //     return data;
    // }, [], {
    //     initialData: []
    // });
    const date = useMemo(() => new Date(), []);
    const {isLoading, data: posts} = useFetch(buildPostizUrl("posts", {
        display: "week",
        day: date.getDay().toString(),
        week: getISOWeek(date).toString(),
        month: date.getMonth().toString(),
        year: date.getFullYear().toString()
    }), {
        headers: POSTIZ_HEADERS,
        mapResult(result: {posts: Post[]}) {
            return {data:result.posts};
        },
        initialData: []
    });

    return <List isLoading={isLoading} isShowingDetail>
        {posts.map(post => <List.Item key={post.id} title={post.id} detail={<List.Item.Detail markdown={post.content} />} />)}
    </List>
}