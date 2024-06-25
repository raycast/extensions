import { getPreferenceValues } from "@raycast/api";
import { rabbitData } from "./utils/rabbitData";

const preferences = getPreferenceValues<Preferences>();

interface AssetData {
	isLoading: boolean;
	data: {
		resources: string[];
	}
}

export default function RabbitAsset(file: string) {
	// console.log(encodeURIComponent(`fetchJournalEntryResources?accessToken=${preferences.accessToken}&urls=["${file}"]`))
	//const asset = rabbitData(`fetchJournalEntryResources?accessToken=${preferences.accessToken}&urls=["${file}"]`) as AssetData;
	const asset = rabbitData(`fetchJournalEntryResources?accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJiOXBBQ2xqeG5JVVBIOHVIYnRZMSJ9.eyJlbWFpbCI6InJvYkByb2JlcnNraW5lLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJyZWdpb24iOiJ1cyJ9LCJyYWJiaXRfcm9sZXMiOltdLCJpc3MiOiJodHRwczovL2xvZ2luLnJhYmJpdC50ZWNoLyIsInN1YiI6ImF1dGgwfDY2NjBhYzk4NjM4YTUzNGM2YTNjZTFlNiIsImF1ZCI6WyJodHRwczovL3JhYmJpdC50ZWNoIiwiaHR0cHM6Ly9yYWJiaXQtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzE3ODc0NTc4LCJleHAiOjE3MTc5NjA5NzgsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJNQmkxVkd5SWVrVW1BZmEwOFRHWEwyTVFvMHJ4TkRhYyJ9.HLtw6-ksxLJsmQGHjWufDw2hpSAGHMa_NQQF_tk6QmdAxodNotYUC4-9s_akZhkhHXEKWbhHjRuxoo3sVmcU3doLxX6v-XdRblWLAuThZdeQ7KiwVN6OXEE1F5KxIG_R9E7spIfT_AnM1n4z-5x0UfTIQxEeT70wqj7UTdj-DPabIHTi2PcirSduZG4M99UHhRo7amwrP2xKtaPG0BPQSP5LFrA30C9E--cv0w2VUDmf5tzAQhPYV8GiCXJ5Rnq1V8IABOgy38wBayhRWghFOXi9YbGoXwlTtwSUld2iSk8mBgO1o_1wzb1AZwfSyFbVGFcARFuqGC816X1evdEm7w&urls=%5B%22s3%3A%2F%2Frabbit-prod-user-journal%2Fauth0%7C6660ac98638a534c6a3ce1e6%2F1717709417910-magic-camera.jpg%22%5D`) as AssetData;
	const assetType = file.split('.').pop() || '';

	console.log(asset)

	if(asset.isLoading) {
		return `Loading asset... \n\n ![loading asset](rabbit-r1-bunny.gif)`
	}

	if(!asset.data) {
		return `asset could not be displayed`
	}
	console.log(asset);

	if (['png', 'gif', 'jpg', 'jpeg', 'svg', 'webp'].includes(assetType)) {
		return `![asset](${asset.data.resources[0]})`;
	} else if (['wav', 'mp3'].includes(assetType)) {
		return `![asset](${asset.data.resources[0]})`;
	} else if (['mp4', 'mov', 'avi', 'mkv'].includes(assetType)) {
		return `![asset](${asset.data.resources[0]})`;
	} else {
		return `asset could not be displayed`;
	}	
}

//https://hole.rabbit.tech/apis/fetchJournalEntryResources?accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJiOXBBQ2xqeG5JVVBIOHVIYnRZMSJ9.eyJlbWFpbCI6InJvYkByb2JlcnNraW5lLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJyZWdpb24iOiJ1cyJ9LCJyYWJiaXRfcm9sZXMiOltdLCJpc3MiOiJodHRwczovL2xvZ2luLnJhYmJpdC50ZWNoLyIsInN1YiI6ImF1dGgwfDY2NjBhYzk4NjM4YTUzNGM2YTNjZTFlNiIsImF1ZCI6WyJodHRwczovL3JhYmJpdC50ZWNoIiwiaHR0cHM6Ly9yYWJiaXQtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzE3ODc0NTc4LCJleHAiOjE3MTc5NjA5NzgsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJNQmkxVkd5SWVrVW1BZmEwOFRHWEwyTVFvMHJ4TkRhYyJ9.HLtw6-ksxLJsmQGHjWufDw2hpSAGHMa_NQQF_tk6QmdAxodNotYUC4-9s_akZhkhHXEKWbhHjRuxoo3sVmcU3doLxX6v-XdRblWLAuThZdeQ7KiwVN6OXEE1F5KxIG_R9E7spIfT_AnM1n4z-5x0UfTIQxEeT70wqj7UTdj-DPabIHTi2PcirSduZG4M99UHhRo7amwrP2xKtaPG0BPQSP5LFrA30C9E--cv0w2VUDmf5tzAQhPYV8GiCXJ5Rnq1V8IABOgy38wBayhRWghFOXi9YbGoXwlTtwSUld2iSk8mBgO1o_1wzb1AZwfSyFbVGFcARFuqGC816X1evdEm7w&urls=%5B%22s3%3A%2F%2Frabbit-prod-user-journal%2Fauth0%7C6660ac98638a534c6a3ce1e6%2F1717709417910-magic-camera.jpg%22%5D
