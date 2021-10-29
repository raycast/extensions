import { 
  List,
  ActionPanel, 
  CopyToClipboardAction,
  OpenInBrowserAction,
  showToast, 
  ToastStyle, 
  Icon, 
  ImageMask,
  getPreferenceValues
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface LinkedInSearch {
  searchResults?: SearchResult[]
  error?: string
  isLoading: boolean
}


type SearchResult = {
  trackingId: string;
  title: string;
  subtitle: string;
  trackingUrn: string;
  navigationUrl: string;
  img: string;
};


export default function SearchResultList() {
  const [searchText, setSearchText] = useState<string>()
  const { isLoading, error, searchResults } = useLinkedInSearch(searchText)

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString())
  }

  return (
    <List 
      isLoading={isLoading} 
      onSearchTextChange={setSearchText} 
      searchBarPlaceholder="Search for people and company...">
      {searchResults?.map((searchResult, i) => (
        <SearchResultItem 
          key={searchResult.trackingId} 
          searchResult={searchResult} />
      ))}
    </List>
  );
}

function SearchResultItem(props: { searchResult: SearchResult }) {
  const searchResult = props.searchResult;
  const ressource = extractLinkedInRessource(searchResult.trackingUrn);
  
  if(!ressource.type ) {
    if( searchResult.subtitle && searchResult.subtitle.includes("in Jobs")){
      ressource.type = "job"
    } else {
      ressource.type = "unknown"
    }
  }

  var targetUrl = searchResult.navigationUrl

  if(ressource.type === "member"){
    // [DEPRECATED] 
    // https://stackoverflow.com/questions/11296262/derive-linkedin-profile-url-from-user-id
    //
    // targetUrl = "http://www.linkedin.com/profile/view?id=" + ressource.id;
  } else if(ressource.type === "company"){
    targetUrl = "https://www.linkedin.com/company/" + ressource.id;
  }

  const defaultIcon = {
    member: '👤',
    company: '🏢',
    job: '💼',
    unknown: Icon.MagnifyingGlass
  } as Record<string,string>

  var accessoryTitle;
  if(searchResult.subtitle){

    var matchs = searchResult.subtitle.match(new RegExp('(?<=• ).+?(?= •)','g'));

    if(matchs && matchs[0]){
      accessoryTitle = matchs[0]
      searchResult.subtitle = searchResult.subtitle.replaceAll('• '+accessoryTitle+' • ','')
    }
  } 
   

  return (
    <List.Item
      id={searchResult.trackingId}
      key={searchResult.trackingId}
      title={searchResult.title}
      subtitle={searchResult.subtitle}
      accessoryTitle={accessoryTitle}
      icon={{ source : (searchResult.img ? searchResult.img : defaultIcon[ressource.type]), mask: (searchResult.img ? ImageMask.RoundedRectangle : null)}}
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Open in LinkedIn" url={targetUrl} />
          <CopyToClipboardAction title="Copy URL" content={targetUrl} />
        </ActionPanel>
      }
    />
  );
}


function useLinkedInSearch(query: string | undefined): LinkedInSearch {
    const [searchResults, setSearchResults] = useState<SearchResult[]>()
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const { LINKEDIN_COOKIE, LINKEDIN_CSRF_TOKEN } = getPreferenceValues()

    let cancel = false

    useEffect(() => {
        async function getHistory() {
            if (cancel) { return }

            setError(undefined)

            try {
              const response = await fetch("https://www.linkedin.com/voyager/api/voyagerSearchDashTypeahead?decorationId=com.linkedin.voyager.dash.deco.search.typeahead.GlobalTypeaheadCollection-27&q=globalTypeahead&query="+query, {
                method: 'get',
                headers: {
                  'Cookie': LINKEDIN_COOKIE,
                  'csrf-token': LINKEDIN_CSRF_TOKEN
                }
              });
              const json = await response.json() as Record<string,any>;

              const searchResults = recordMapper({ 
                sourceRecords : json.elements as any[],
                models : [                
                  { targetKey : "trackingId", sourceKeys : ["entityLockupView","trackingId"]},
                  { targetKey : "title", sourceKeys : ["entityLockupView","title","text"]},                  
                  { targetKey : "subtitle", sourceKeys : ["entityLockupView","subtitle","text"]},
                  { targetKey : "trackingUrn", sourceKeys : ["entityLockupView","trackingUrn"]},
                  { targetKey : "navigationUrl", sourceKeys : ["entityLockupView","navigationUrl"]},                  
                  { targetKey : "img", sourceKeys : ["entityLockupView","image","attributes","0","detailDataUnion","vectorImage","artifacts","0","fileIdentifyingUrlPathSegment"]},
                ] as any
              }) as SearchResult[]

              setSearchResults(searchResults);

            } catch (e) {
              if (!cancel) {
                  setError(e as string)
              }
            } finally {
              if (!cancel)
                  setIsLoading(false)
            }
        }

        if(query){
          getHistory();
        } else {
          setIsLoading(false)
        }
        

        return () => {
            cancel = true
        }

    }, [query])

    return { searchResults, error, isLoading }
}



function recordMapper (mapper: { sourceRecords : any[], models: [{targetKey : string, sourceKeys : string[]}]}): Record<string, any> {
  const sourceRecords = mapper.sourceRecords;
  const models = mapper.models;

  var mappedRecords = [] as any[];

  sourceRecords.forEach(function (sourceRecord){
    var mappedRecord = {} as any;
    models.forEach(function (model){
      const sourceKeys = model.sourceKeys;
      const targetKey = model.targetKey;
      var tempRecord = JSON.parse(JSON.stringify(sourceRecord));
      sourceKeys.forEach(function (sourceKey){
        if(!tempRecord){
          return
        }
        if(sourceKey in tempRecord ){
          tempRecord = tempRecord[sourceKey];
        }else{
          tempRecord = null;
          return
        }
      })
      mappedRecord[targetKey] = tempRecord;
    })
    mappedRecords.push(mappedRecord)
  })
  return mappedRecords;
}

function extractLinkedInRessource ( trackingUrn: string): Record<string, string | null> {
  if(trackingUrn !== null){

    const type = trackingUrn.match(/(?<=urn\:li\:).+?(?=\:)/g);
    
    const id = trackingUrn.match( new RegExp('(?<=urn\:li\:'+type+':).+', 'g'));
    
    if(type && type[0] && id && id[0]){
      return { type: type[0], id: id[0] }
    } else {
      return { type: null, id: null }
    }
    
  }else{
    
    return { type: null, id: null }
  }
}
