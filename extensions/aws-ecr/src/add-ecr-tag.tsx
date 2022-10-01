import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { ImageDetailList } from "aws-sdk/clients/ecr";

interface TagValues {
    currentTag: string;
    newTag: string;
    repository: string;
}


export default function Command( props: { draftValues?: TagValues } ) {
    const { draftValues } = props;
    const [repository, setRepository] = useState<string>( draftValues?.repository || "" );

    const [imageList, setImageList] = useState<ImageDetailList>([]);

    const [currentTag, setCurrentTag] = useState<string>( draftValues?.currentTag || "" );

    const [repositoryList, setRepositoryList] = useState<string[]>([]);
  
    const [shouldExecute,execute] = useState(false);
    useExec("aws ecr describe-images --repository "+repository+" --query 'reverse(sort_by(imageDetails,& imagePushedAt))[*]'",
    { execute: shouldExecute, shell: true, onData: (data) => { 
        showToast(Toast.Style.Success, "Tags Loaded");
        setImageList(JSON.parse(data));

    }, onError: (error) => { 
        showToast(Toast.Style.Failure, "Error Loading Tags");
    }})
    
    useExec("aws ecr describe-repositories --query 'repositories[*].repositoryName'", {shell:true, onData: (data) => {
        showToast(Toast.Style.Success, "Repositories Loaded");
        setRepositoryList(JSON.parse(data));
    }, onError: (error) => {
        showToast(Toast.Style.Failure, "Error Loading Repositories");
    }})

    useEffect(()=>{

        // async function fetchImages() {
        //     console.log("fetching images");
        //         ecr.describeImages({repositoryName: repository, filter: { tagStatus: "TAGGED" }}, (err, data) => {
        //             if (err) {
        //                 showToast(Toast.Style.Failure, "error retrieving image list", (err as any).message);
        //             } else {
        //                 if (data.imageDetails ) {
        //                     setImageList(data.imageDetails);
        //                 }
        //             }
                    
                  
        //         });
            
        // } 

        // if (repository !== "") {
           
        // }
        if (repositoryList.length == 0 ){
            showToast(Toast.Style.Animated, "Loading Repositories");
        }
       
     
    },[repositoryList]);

    useEffect(()=>{
        if(shouldExecute){
            execute(false);
        }
    },[shouldExecute]);


    function onRepositoryChange(value: string) {
        setRepository(value);
        setCurrentTag("");
        setImageList([]);
        showToast(Toast.Style.Animated, "Fetching Image Tags");
        execute(true);
    }

  return (
    <Form 
        actions = {
            <ActionPanel>
                <UpdateECRTagAction/>
            </ActionPanel>
        }
    >


      < GetRepositoryList repositoryList={repositoryList} onRepositoryChange= {onRepositoryChange}/>

      <Form.TextField id="newTag" title="New Tag" storeValue defaultValue={draftValues?.newTag}/>

      <GetImagesList imageList={imageList} setCurrentTag={setCurrentTag} currentTag={currentTag}/>

    </Form>
  );
}

function UpdateECRTagAction() {
    const [shouldExecute,execute] = useState(false);
    const [formValues, setFormValues] = useState<TagValues>({currentTag: "", newTag: "", repository: ""});
        const { isLoading, data } = useExec("aws ecr put-image --repository-name "+formValues.repository+" --image-tag "+formValues.newTag+" --image-manifest \"$(aws ecr batch-get-image --repository-name "+formValues.repository+" --image-ids imageTag="+formValues.currentTag+" --output json | jq --raw-output --join-output '.images[0].imageManifest')\"",
    { execute: shouldExecute, shell: true });

    async function handleSubmit(values: TagValues) {

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Updating ECR Tag",
        });

        try {
           
            setFormValues(values);
            execute(true);

            toast.hide();
            showToast(Toast.Style.Success, "ECR Tag Updated");
        } catch (error) {
            toast.hide();
            showToast(Toast.Style.Failure, (error as any).message);
        }
    }

    useEffect(()=>{
        if(shouldExecute){
            execute(false);
        }
    },[shouldExecute]);


    return <Action.SubmitForm title = "Update Tag" onSubmit={handleSubmit}/>
}

function GetRepositoryList( props:{ repositoryList: string[], onRepositoryChange: (value: string) => void })  {

    const {repositoryList} = props;
    return (
        <Form.Dropdown id="repository" title="Repository" onChange={props.onRepositoryChange}>

        {
            repositoryList.map((repo) => {
                return <Form.Dropdown.Item value={repo} title={repo} />
            })
        
        }
        </Form.Dropdown>
    )
}


function GetImagesList(props: {imageList: ImageDetailList, currentTag: string, setCurrentTag: (tag: string) => void}) {

    const { imageList } = props;

    return    (   
    <Form.Dropdown id="currentTag" title="Tag List" value={props.currentTag} onChange= {props.setCurrentTag}>

        { imageList.map( (image) => {
            if (image.imageTags) {
                for (let i = 0; i < image.imageTags.length; i++) {
                    const tag = image.imageTags[i];
                    if (tag.charAt(0) == "v") {
                        return <ImageListItem imageDigest={image.imageDigest} imageTag={tag}/>
                    }
                }
            } 
        } ) }

    
    </Form.Dropdown>
    );
    
}

function ImageListItem(props: {imageDigest?: string, imageTag: string}) {
    const { imageDigest, imageTag } = props;
    return (

        <Form.Dropdown.Item value={imageTag} title={imageTag} />
    );
}
