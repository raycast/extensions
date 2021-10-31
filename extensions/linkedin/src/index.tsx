import { 
  Detail,
  List,
  ActionPanel,
  PushAction, 
  CopyToClipboardAction,
  OpenInBrowserAction,
  showToast, 
  ToastStyle, 
  Icon, 
  ImageMask,
  render
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

import { getCookies } from "./chrome-cookies-secure";


interface LinkedInSearch {
  searchResults?: SearchResult[]
  error?: string
  isLoading: boolean
}

interface LinkedInProfile {
  profile?: Record<striing, any>
  error?: string
  isLoading: boolean
}


type SearchResult = {
  searchId: string;
  trackingId: string;
  title: string;
  subtitle: string;
  trackingUrn: string;
  navigationUrl: string;
  img: string;
};

var LINKEDIN_COOKIE;
var LINKEDIN_CSRF_TOKEN;
var LINKEDIN_COOKIE_EXPIRED;

export default function SearchResultList() {
  const [searchText, setSearchText] = useState<string>()
  const { isLoading, error, searchId, searchResults } = useLinkedInSearch(searchText)

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString())
  }

  getCookies('https://www.linkedin.com/', function(err, cookies) {

    if(!err && cookies && cookies[0]){
      LINKEDIN_COOKIE = '';
      cookies.forEach(function (cookie){
        LINKEDIN_COOKIE+=cookie.name+'='+cookie.value+';'
        if(cookie.name=== 'JSESSIONID'){
          LINKEDIN_CSRF_TOKEN = cookie.value.replace(/\"/g, "")
        } 
      })

      LINKEDIN_COOKIE_EXPIRED = false;
    }

  });

  if(LINKEDIN_COOKIE_EXPIRED){
    render (
        <Detail 
          markdown={`## Missing LinkedIn's Cookie 🍪
          \n We couldn\'t find your LinkedIn cookies or they were expired.
          \n To resolve this issue, simply open **Google Chrome** and sign into your LinkedIn account.
          \n ⚠️ *It can take up to a minute once signed in for the extension to work*
          \n ![Sing Into LinkedIn](https://cdn.henrichabrand.com/raycast/sign-in-banner.png)`}
          actions={
            <ActionPanel> 
              <OpenInBrowserAction title="Sign Into LinkedIn" url="https://www.linkedin.com/login" />
            </ActionPanel>
          }
         />
      );
  }

 


  return (
    <List 
      isLoading={isLoading} 
      onSearchTextChange={setSearchText} 
      searchBarPlaceholder="Search for people and company...">
        <List.Section title="My Network">
          {searchResults?.map(function (searchResult, i) {
            if(searchResult.subtitle && (searchResult.subtitle.includes('• 1st •') || searchResult.subtitle.includes('• You •')) ){
              return(<SearchResultItem 
              key={searchResult.trackingId} 
              searchResult={searchResult}
              searchId={searchId} 
              searchPos={i} 
              query={searchText}/>)
            }          
          })}
      </List.Section>
      <List.Section title="Global Network">
          {searchResults?.map(function (searchResult, i) {
            if(searchResult.subtitle && !(searchResult.subtitle.includes('• 1st •') || searchResult.subtitle.includes('• You •')) ){
              return(<SearchResultItem 
              key={searchResult.trackingId} 
              searchResult={searchResult}
              searchId={searchId} 
              searchPos={i} 
              query={searchText}/>)
            }          
          })}
      </List.Section>
    </List>
  );
}


export function ProfileDetail(props: { searchId: string, searchPos: number, query: string | undefined }) {
  const searchId = props.searchId;
  const searchPos = props.searchPos;
  const query = props.query;

  const { isLoading, error, profile } = useLinkedInProfile(searchId, searchPos, query)

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString())
  }


  var profileMarkdown = 'Loading...';

  if(profile){
    profileMarkdown = `![${profile.title} <](${(profile.imgRoot ? profile.imgRoot+profile.img200 : (profile.logoRoot ? profile.logoRoot+profile.logo200 : ''))})
    \n -------
    \n # ${profile.title}
    \n ### ${profile.subtitle}
    \n ${(profile.badgeText ? profile.badgeText : '')}
    \n _${(profile.secondarySubtitle ? profile.secondarySubtitle : '')}_
    \n ------- `;

    if(profile.contactInfo){
      profileMarkdown+='\n **Contact Details** \n';

      if(profile.contactInfo.birthDateOn && profile.contactInfo.birthDateOn.month && profile.contactInfo.birthDateOn.day ){
        profileMarkdown+='\n 🎂 : ' + (profile.contactInfo.birthDateOn.day < 10 ? '0'+profile.contactInfo.birthDateOn.day : profile.contactInfo.birthDateOn.day) +'/'+ (profile.contactInfo.birthDateOn.month < 10 ? '0'+profile.contactInfo.birthDateOn.month : profile.contactInfo.birthDateOn.month) +' \n ';
      }
      if(profile.contactInfo.emailAddress){
        profileMarkdown+='\n ✉️ : ['+profile.contactInfo.emailAddress+'](mailto:'+profile.contactInfo.emailAddress+') \n ';
      }

      if(profile.contactInfo.websites && profile.contactInfo.websites[0]){
        profile.contactInfo.websites.forEach(function(website){
          profileMarkdown+='\n 🔗 : ['+website.url+']('+website.url+')';
          if(website.type && website.type['com.linkedin.voyager.identity.profile.StandardWebsite'] && website.type['com.linkedin.voyager.identity.profile.StandardWebsite'].category){
              profileMarkdown+=' ('+website.type['com.linkedin.voyager.identity.profile.StandardWebsite'].category+')';
          } 
        })
      }

      if(profile.contactInfo.twitterHandles && profile.contactInfo.twitterHandles[0]){
        profile.contactInfo.twitterHandles.forEach(function(twitterHandle){
          profileMarkdown+='\n 🐦 : [@'+twitterHandle.name+'](https://twitter.com/'+twitterHandle.name+') \n';
        })
      }

      
    }
  }
  

  

  return (
    <Detail 
      isLoading={isLoading} 
      markdown={profileMarkdown}
      actions={(profile && profile.navigationUrl ?
        <ActionPanel
          title={(profile ? profile.title : null)}
        >        
          <OpenInBrowserAction title="Open in LinkedIn" url={(profile && profile.navigationUrl? profile.navigationUrl : null)} />
          <CopyToClipboardAction title="Copy URL"  content={(profile && profile.navigationUrl? profile.navigationUrl : null)} />
        </ActionPanel>
        : null )
      }
       />
  );
}




function SearchResultItem(props: { searchResult: SearchResult, searchId: string, searchPos: number, query: string | undefined}) {
  const searchResult = props.searchResult;
  const searchId = props.searchId;
  const searchPos = props.searchPos;
  const query = props.query;
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
      searchResult.subtitle = searchResult.subtitle.replace(new RegExp('• '+accessoryTitle+' • ','g'), "")
    }
  } 
   

  return (
    <List.Item
      id={searchResult.trackingId}
      key={searchResult.trackingId}
      title={searchResult.title}
      subtitle={searchResult.subtitle}
      accessoryTitle={accessoryTitle}
      icon={{ source : (searchResult.img ? searchResult.img : defaultIcon[ressource.type]), mask: (searchResult.img ? ImageMask.RoundedRectangle : undefined)}}
      actions={
        <ActionPanel
          title={searchResult.title}
        >        
          <PushAction 
            icon={Icon.Eye}
            title="Preview Details" 
            target={<ProfileDetail 
              searchId={searchId} 
              searchPos={searchPos} 
              query={query}/>} />
          <OpenInBrowserAction title="Open in LinkedIn" url={targetUrl} />
          <CopyToClipboardAction title="Copy URL" content={targetUrl} />
        </ActionPanel>
      }
    />
  );
}


function useLinkedInSearch(query: string | undefined): LinkedInSearch {
    const [searchResults, setSearchResults] = useState<SearchResult[]>()
    const [searchId, setSearchId] = useState<string>()
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    let cancel = false

    useEffect(() => {
        async function getSearch() {
            if (cancel) { return }

            setError(undefined)

            try {
              const response = await fetch("https://www.linkedin.com/voyager/api/voyagerSearchDashTypeahead?decorationId=com.linkedin.voyager.dash.deco.search.typeahead.GlobalTypeaheadCollection-27&q=globalTypeahead&query="+query, {
                method: 'get',
                headers: {
                  'Cookie': LINKEDIN_COOKIE,
                  'csrf-token': LINKEDIN_CSRF_TOKEN,
                  'x-restli-protocol-version': '2.0.0'
                }
              });
              const json = await response.json() as Record<string,any>;

          
              setSearchId(json.metadata.searchId as string);

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
              LINKEDIN_COOKIE_EXPIRED = true;
              if (!cancel) {
                  setError(e as string)
              }
            } finally {
              if (!cancel)
                  setIsLoading(false)
            }
        }

        if(query){
          getSearch();
        } else {
          setIsLoading(false)
        }
        

        return () => {
            cancel = true
        }

    }, [query])

    return { searchResults, searchId, error, isLoading }
}



function useLinkedInProfile(searchId: string, searchPos: number, query: string): LinkedInProfile {
    const [profile, setProfile] = useState<Record<striing, any>>()
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    let cancel = false



    useEffect(() => {
        async function getProfile() {
            if (cancel) { return }

            setError(undefined)

            try {
              const response = await fetch("https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-126&origin=RICH_QUERY_SUGGESTION&q=all&query=(keywords:"+encodeURIComponent(query)+",flagshipSearchIntent:SEARCH_SRP,queryParameters:(position:List("+searchPos+"),resultType:List(ALL),searchId:List("+searchId+")),includeFiltersInResponse:false)&start=0", {
                method: 'get',
                headers: {
                  'Cookie': LINKEDIN_COOKIE,
                  'csrf-token': LINKEDIN_CSRF_TOKEN,
                  'x-restli-protocol-version': '2.0.0'
                }
              });
              const json = await response.json() as Record<string,any>;

              const profileResult = recordMapper({ 
                sourceRecords : json.elements as any[],
                models : [                
                  { targetKey : "title", sourceKeys : ["featureUnion","heroEntityCard","title","text"]},
                  { targetKey : "subtitle", sourceKeys : ["featureUnion","heroEntityCard","primarySubtitle","text"]},
                  { targetKey : "secondarySubtitle", sourceKeys : ["featureUnion","heroEntityCard","secondarySubtitle","text"]},                  
                  { targetKey : "badgeText", sourceKeys : ["featureUnion","heroEntityCard","badgeText","accessibilityText"]},
                  { targetKey : "imgRoot", sourceKeys : ["featureUnion","heroEntityCard","image","attributes","0","detailData","profilePicture","profilePicture","displayImageReference","vectorImage","rootUrl"]},
                  { targetKey : "img200", sourceKeys : ["featureUnion","heroEntityCard","image","attributes","0","detailData","profilePicture","profilePicture","displayImageReference","vectorImage","artifacts","1","fileIdentifyingUrlPathSegment"]},
                  { targetKey : "logo200", sourceKeys : ["featureUnion","heroEntityCard","image","attributes","0","detailData","companyLogo","logo","vectorImage","artifacts","0","fileIdentifyingUrlPathSegment"]},
                  { targetKey : "logoRoot", sourceKeys : ["featureUnion","heroEntityCard","image","attributes","0","detailData","companyLogo","logo","vectorImage","rootUrl"]},
                  { targetKey : "trackingUrn", sourceKeys : ["featureUnion","heroEntityCard","trackingUrn"]},
                  { targetKey : "navigationUrl", sourceKeys : ["featureUnion","heroEntityCard","navigationUrl"]},
                  { targetKey : "trackingId", sourceKeys : ["featureUnion","heroEntityCard","trackingId"]},
                  { targetKey : "memberRelationshipUrn", sourceKeys : ["featureUnion","heroEntityCard","primaryActions","0","actionDetails","primaryProfileActionV2","primaryAction","connection","memberRelationshipUrn"]}                
                ] as any
              })[0] as Record<striing, any>
            
            setProfile(profileResult);

            if(profileResult.trackingUrn && profileResult.trackingUrn.includes('urn:li:member:')){
              profileResult.handler = profileResult.navigationUrl.match(/(?<=\/in\/).+?(?=\?)/g)[0]

            

             const response2 = await fetch("https://www.linkedin.com/voyager/api/identity/profiles/"+profileResult.handler+"/profileContactInfo", {
                method: 'get',
                headers: {
                  'Cookie': LINKEDIN_COOKIE,
                  'csrf-token': LINKEDIN_CSRF_TOKEN,
                  'x-restli-protocol-version': '2.0.0'
                }
              });
              const json2 = await response2.json() as Record<string,any>;
              
              profileResult.contactInfo = json2;
              setProfile(profileResult);
            }

            
              

            } catch (e) {
              LINKEDIN_COOKIE_EXPIRED = true;
              if (!cancel) {
                  setError(e as string)
              }
            } finally {
              if (!cancel)
                  setIsLoading(false)
            }
        }

        if(query){
          getProfile();
        } else {
          setIsLoading(false)
        }
        

        return () => {
            cancel = true
        }

    }, [searchId, searchPos, query])

    return { profile, error, isLoading }
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
