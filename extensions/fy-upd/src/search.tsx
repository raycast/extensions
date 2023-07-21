import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { showToast, Toast, LaunchProps, Detail, Action, ActionPanel, LocalStorage } from "@raycast/api";
interface Arguments {
    query?: string
}

interface ApiResponse {
    isLoading: boolean;
    data?: Array<DataObj>
}

interface DataObj {
    id: number
    file_name: string
    batchcode: string
    group_batchcode: any
    leg: string
    no_of_rows: number
    date_time: string
    uploaded_by: string
    input_file_name: string
    source_file_url: string
    source_file_id: string
    vendor_id: number
    date_received: string
    is_deleted: number
    max_qty: any
    available_qty: any
    qty_basis: any
    max_qty_per_shipment: any
    available_for: any
    is_special_rate: number
    allow_unlimited: number
    status: string
    status_activity: any
    start_date: string
    expiry: string
    updated_at: any
    row_summry: any
    is_master: number
    sv_id: number
    airline_code: any
    warnings: any
    agent_id: any
    file_s3_url: string
    charge_type: string
    tags: any
    market_rate: number
    market_rate_currency: string
    cqrs_status: string
    cqrs_log: string
    source: string
    mode: string
    sv_combination: string
    db: any
    is_deleting: number
    validation_time: number
    process_time: number
    process_start_time: string
    deleted_at: any
    deleted_by: any
    location_file_url: any
    charge_code: any
    vendor_name: string
    sv_name: string
    agent_name: any
    user_type: number
}


export default function main(props: LaunchProps<{ arguments: Arguments }>) {
    const getCookie = async() => await LocalStorage.getItem<string>("cookie")
    const [cookie, setCookie] = useState("")

    useEffect(() => {
        getCookie().then(res => setCookie(res as string))
    }, [])

    const { isLoading, data, revalidate } = useFetch<ApiResponse>("https://app2.freightbro.com/shipper/get-shipper-upload-details", {
        method: "POST",
        body: `page=1&limit=10&query=${props.arguments.query}`,
        headers: {
            "cookie": cookie
        }
    });

    // const results = data?.data as Array<DataObj>
    // const finalResult = results[0]
    // const finalResult = results.find(c => c.batchcode.toLowerCase().includes(props.arguments.batchcode?.toLowerCase() as string))
    // console.log(props.arguments.batchcode)
    // console.log(finalResult)
    //
    // return (
    //     <Detail
    //         isLoading={isLoading}
    //         markdown={"jfasd"}
    //         actions={
    //             <ActionPanel>
    //                 <Action title="Reload" onAction={() => revalidate()} />
    //             </ActionPanel>
    //         }
    //
    //     />
    //
    // )

    // const [results, setResults] = useState<Array<DataObj>>();
    // const [loading, setLoading] = useState(false);
    //
    // useEffect(() => {
    //     (async function run() {
    //         if (typeof props?.arguments?.query !== "string") {
    //             return;
    //         }
    //
    //         setLoading(true);
    //
    //         try {
    //             const { isLoading, data, revalidate } = useFetch<ApiResponse>("https://staging.freightbro.com/shipper/get-shipper-upload-details", {
    //                 method: "POST",
    //                 body: `page=1&limit=10&query=IgK3QTgPlG30ghvxHIhutobwfYQKdmkViZZpfKSm`,
    //                 headers: {
    //                     "cookie": "remember_account_5ab1837e91245bf513442c708b50254d=eyJpdiI6Ikp3bFVSQ05nS0hqdnFIbHA0T051ZWc9PSIsInZhbHVlIjoicnBKaHYrMTR5UTdUZkdHTTBUOU9xU21nejc2ZEkwTE9vUXd2RUlDYzRTTFR2VW1HVUdGa3R6ZXgwaldEQjBwS3MwTm1SZUphZ0NWRStsSlhZMHZ1Rmp3SUMyOU5Jd3VaOWtQV1BkRFBTWUU9IiwibWFjIjoiN2JhZTg1NjgzOWQzM2U0ZmM4MTdmYTUyZGRhODEyZjRhZmU3NmM2NWZkMzBlN2YyYjhjYTdkNzg4YzcxMjc2ZCJ9; laravel_session=eyJpdiI6Inc4MVo3WFg2b2tBUEJhVnUxRDY2UkE9PSIsInZhbHVlIjoiSk5ub1wvV281amZnVlNiV2xYNHBcL2phdXZENlh5bUx0byswWHdKbE9CeEJSZWVHM1E2cENLMlFcLzFEMjdBZHllYzBSM0tmOEM0b2ttQ3hvYW5IVHdLZ1E9PSIsIm1hYyI6Ijg0MzljZjM3MTk5NzU1MGQ1ZWY5MDk1YTJmYjA0Nzk1M2NmMjcxMjMzYWNlOTMyNzk4YWQ2ZGRiZWY4NWUzOWMifQ%3D%3D"
    //                 }
    //             });
    //             console.log(data)
    //             setResults(data?.data as Array<DataObj>);
    //         } catch (e) {
    //             displayError("Search Error");
    //         }
    //
    //         setLoading(false);
    //     })();
    // }, []);
    //
    // /**
    //  * displayError
    //  */
    //
    // function displayError(message: string) {
    //     showToast({
    //         style: Toast.Style.Failure,
    //         title: "Error",
    //         message: message,
    //     });
    // }

    return (
        data?.data?.map((res) => {
            const returnData = `File Name: ${res.file_name}\n \n Input File Name: ${res.input_file_name}  \n \n Vendor: ${res.vendor_name} \n \n Sub vendor: ${res.sv_name} \n \n Airline: ${res.airline_code} \n \n Leg: ${res.leg} \n \n Group Batchcode: ${res.group_batchcode} \n \n Uploaded By: ${res.uploaded_by} \n \n Status: ${res.status} \n \n Cqrs Status: ${res.cqrs_status} \n \n Uploaded On: ${res.date_time} \n \n Deleted By: ${res.deleted_by}\n \n File Url: https://staging.freightbro.com/shipper/signedurl?privateurl=${res.file_s3_url} \n \n `
            return <Detail
                key={res.batchcode}
                isLoading={isLoading}
                markdown={returnData}
                actions={
                    <ActionPanel>
                    <Action.CopyToClipboard title="Copy File Url" content={`https://app2.freightbro.com/shipper/signedurl?privateurl=${res.file_s3_url}`} shortcut={{ modifiers: ["cmd"], key: "." }}/>
                    </ActionPanel>
                }
            />
        }

        ))

}
