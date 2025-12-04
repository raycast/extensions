import { ActionPanel, Form, Action, Clipboard, Toast, showToast, open } from "@raycast/api";
import Axios from "axios";

export default () => {
  const fetchCitation = async (url: string) => {
    const { data: response } = await Axios.post("https://formatically.com/api/website", {
      url: url,
    });

    const addElement = (citation: string, element: string) => {
      return citation.length ? ` ${element}` : element;
    };

    const formatCreators = (creators: creator[]) => {
      let formattedCreators = "";

      if (creators.length === 1) {
        formattedCreators = `${creators[0].lastName}, ${creators[0].firstName}.`;
      }

      if (creators.length === 2) {
        formattedCreators = `${creators[0].lastName}, ${creators[0].firstName} and ${creators[1].firstName} ${creators[1].lastName}.`;
      }

      if (creators.length >= 3) {
        formattedCreators = `${creators[0].lastName}, ${creators[0].firstName}, et al.`;
      }

      return formattedCreators;
    };

    const formatDate = (date: string) => {
      const year = date.split("-")[0];
      const day = date.split("-")[2];
      const month = (() => {
        const rawMonth = date.split("-")[1];
        switch (rawMonth) {
          case "01":
            return "Jan.";
          case "02":
            return "Feb.";
          case "03":
            return "Mar.";
          case "04":
            return "Apr.";
          case "05":
            return "May";
          case "06":
            return "Jun.";
          case "07":
            return "Jul.";
          case "08":
            return "Aug.";
          case "09":
            return "Sept.";
          case "10":
            return "Oct.";
          case "11":
            return "Nov.";
          case "12":
            return "Dec.";
        }
      })();

      return `${day} ${month} ${year}`;
    };

    type creator = {
      creatorType: string;
      firstName: string;
      lastName: string;
    };

    let citation = "";

    if (response.creators[0].firstName !== "") {
      const creators = formatCreators(response.creators.filter((creator: creator) => creator.creatorType === "author"));

      citation += addElement(citation, creators);
    }

    if (response.title) {
      citation += addElement(citation, `"${response.title}."`);
    }

    if (response.websiteTitle) citation += addElement(citation, `${response.websiteTitle},`);

    if (response.date) {
      const date = formatDate(response.date);
      citation += addElement(citation, `${date},`);
    }

    if (response.url) citation += addElement(citation, `${response.url}.`);

    return citation;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Citation"
            onSubmit={async ({ url }) => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Generating citation" });

              try {
                const citation = await fetchCitation(url);

                await Clipboard.copy(citation!);

                toast.style = Toast.Style.Success;
                toast.title = "Generated citation!";
                toast.message = "Copied citation to clipboard";
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Citation generation failed";
                toast.message = "Try the online version here";
                toast.primaryAction = {
                  title: "Open online version",
                  onAction: (toast) => {
                    open("https://formatically.com");
                    toast.hide();
                  },
                };

                console.log(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="url" placeholder="https://www.linktoarticle.com" title="URL" />
    </Form>
  );
};
