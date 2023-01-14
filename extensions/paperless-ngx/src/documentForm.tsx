import {Action, ActionPanel, Form, LaunchProps, popToRoot, showToast, Toast,} from '@raycast/api';
import {useEffect, useState} from 'react';
import {NewDocument} from './models/newDocument.model';
import {fetchDocumentTags} from './utils/fetchDocumentTags';
import {fetchDocumentTypes} from './utils/fetchDocumentTypes';
import {fetchCorrespondents} from './utils/fetchCorrespondents';
import {correspondent, documentTag, documentType} from './models/paperlessResponse.model';
import {postDocument} from './utils/postDocument';


export default function DocumentForm(props: LaunchProps<{ draftValues: NewDocument }>) {

    const [files, setFiles] = useState<string[]>([]);

    const [tagOptions, setTagOptions] = useState<documentTag[]>();
    const [typeOptions, setTypeOptions] = useState<documentType[]>();
    const [correspondentOptions, setCorrespondentOptions] = useState<correspondent[]>();

    const submit = async (value: any) => {
        if (files) {
            await postDocument(value, files[0]).then(() => {
                showToast(Toast.Style.Success, 'File uploaded successfully');


                // popToRoot({clearSearchBar: true});
            }).catch((error) => {
                showToast(Toast.Style.Failure, 'Error', error);
            });
        }
    };

    useEffect(() => {
        async function fetchOptions() {
            const documentTags: documentTag[] = await fetchDocumentTags();
            setTagOptions(documentTags);
            const documentTypes: documentType[] = await fetchDocumentTypes(true);
            setTypeOptions(documentTypes);
            const correspondents: correspondent[] = await fetchCorrespondents(true);
            setCorrespondentOptions(correspondents);
        }

        fetchOptions().then();
    }, []);

    return (
        <Form
            // enableDrafts
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Upload document" onSubmit={(values) => submit(values)}/>
                </ActionPanel>
            }
        >
            <Form.TextField id="titleName" title="Title" placeholder="Enter the document title"/>

            <Form.DatePicker id="date" title="Creation date"/>

            <Form.Dropdown id="correspondent" filtering title="Correspondent">
                {correspondentOptions?.length
                    ? correspondentOptions.map((correspondent) => {
                        return <Form.Dropdown.Item key={correspondent.id}
                                                   value={correspondent.id.toString()}
                                                   title={correspondent.name}/>;
                    })
                    : null}
            </Form.Dropdown>

            <Form.Dropdown id="type" filtering title="Type">
                {typeOptions?.length
                    ? typeOptions.map((type) => {
                        return <Form.Dropdown.Item key={type.id}
                                                   value={type.id.toString()}
                                                   title={type.name}/>;
                    })
                    : null}
            </Form.Dropdown>

            <Form.TagPicker id="tags" title="Tags">
                {tagOptions?.length
                    ? tagOptions.map((tag) => {
                        return <Form.TagPicker.Item key={tag.id}
                                                    value={tag.id.toString()}
                                                    title={tag.name}/>;
                    })
                    : null}
            </Form.TagPicker>

            <Form.FilePicker id="file" title="File" value={files} onChange={setFiles} allowMultipleSelection={false}/>
        </Form>
    );
};
