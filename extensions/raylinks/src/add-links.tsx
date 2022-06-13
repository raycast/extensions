import { ActionPanel, Form, Action, popToRoot, showToast, Toast } from "@raycast/api";
import { saveStoredLinks, getStoredLinks } from "./utils/local-storage";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import validator from "validator";
import { RLLink } from "./utils/types";

export default function addLinksToRaycast(defaultValues: RLLink) {
  const [links, setLinks] = useState<Array<RLLink>>([]);
  function isObjectEmpty(obj: any) {
    return Object.keys(obj).length === 0;
  }
  const isNewLinkCreation = isObjectEmpty(defaultValues);

  // this is a custom hook that will fetch the currenty stored links from local storage, and store it in "links"
  useEffect(() => {
    const getDataFromStorage = async () => {
      getStoredLinks().then((links) => {
        setLinks(links);
      });
    };

    getDataFromStorage();
  }, []);

  // This will run when form is submitted
  async function handleFormSubmit(formValues: RLLink) {
    const linkValidationInfo = validator.isURL(formValues.link);

    // title validation
    if (!formValues.title) {
      showToast(Toast.Style.Failure, "Title cannot be empty");
      return;
    }

    //link validation
    if (!linkValidationInfo) {
      await showToast(Toast.Style.Failure, "Invalid URL: Please enter a valid URL");
      return;
    }

    if (isNewLinkCreation) {
      //create new link object
      const linkId = nanoid();
      const newLink: RLLink = {
        id: linkId,
        title: formValues.title,
        link: formValues.link,
      };

      links.push(newLink);
      await setLinks(links);

      await saveStoredLinks(links);
      await showToast(Toast.Style.Success, `Created new link!`, newLink.title);
      await popToRoot({ clearSearchBar: true });
    } else {
      //update existing link object
      const newLinks = links.map((link) => {
        if (link.id === defaultValues.id) {
          const updatedLink: RLLink = {
            id: link.id,
            title: formValues.title,
            link: formValues.link,
          };
          return updatedLink;
        }
        return link;
      });
      await setLinks(newLinks);
      await saveStoredLinks(newLinks);
      await showToast(Toast.Style.Success, `Updated link`, defaultValues.title);
      await popToRoot({ clearSearchBar: true });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create link" onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        placeholder="Give your link a name"
        title="Link name"
        storeValue={false}
        defaultValue={defaultValues?.title}
      />
      <Form.TextField
        id="link"
        placeholder="Add your link"
        title="Link URL"
        storeValue={false}
        defaultValue={defaultValues?.link}
      />
    </Form>
  );
}
