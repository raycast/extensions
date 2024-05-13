import { IS_CLOUD, umami } from "./lib/umami";
import ErrorComponent from "./components/ErrorComponent";
import { useFetch } from "@raycast/utils";
import { Detail } from "@raycast/api";
import useUmami from "./lib/useUmami";

export default function Users() {
    // if (IS_CLOUD) {
    //     const error = { name: "", message: "Not available in Umami Cloud" };
    //     return <ErrorComponent error={error} />
    // }
    
    // const {data} = useUmami(umami.getUsers({
        
    // }))

    // const { isLoading, data } = useFetch(`https://umami.xmok.me/api/me`, {
    //     headers: {
    //         Accept: "application/json",
    //         Authorization: `Bearer FS0koUVPt3ulkYnBdrB7qfWBrNRVjW5eQyqsareCJKuwrTHV9KW2X/mfi/5cZJdlCBJBM8ibO1OmrG8ID1KG8grTv78j8qeG4sTVPgwFs3PaQV9Vccw1j2F3rUWSFXaVtFIjWhomLmqS4+J1JAb079q8zNnQ/2mBby6JMfqlCQVKm6GyOHW6MrmL107IF69MV0e9PMwzVPFqOjgSnFDAOcAH43CZulZ/aw/eUmGWYfhAnQnaoPRt3MYZyWLpW+o5AA+3FFUjXeaJChR8JDlF7Qm/AUgwdBb2vo2StoQtw5etv9BiiGN5KbeIei+dQcK99+of9/PMvhFKuA6z2N8cMZ93gaqZsr5ew==`
    //     },
    //     onData(data) {
    //         console.log({data})
    //     }
    // });
    // return <Detail isLoading={isLoading} />
}