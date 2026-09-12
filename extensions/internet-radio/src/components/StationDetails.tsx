import { Icon, List } from "@raycast/api";
import { StationData, WebsiteData, SocialProfileData, PolicyData, ContactData } from "../types";

const contactIcons: { [key: string]: Icon } = {
  phone: Icon.Phone,
  email: Icon.Envelope,
  fax: Icon.Print,
  form: Icon.Text,
  address: Icon.Map,
  "p.o. box": Icon.Box,
};

export default function StationDetails(props: { stationName: string; data: StationData; tags: JSX.Element[] }) {
  const { stationName, data, tags } = props;

  const showLogo = data.logo != undefined && data.logo.length > 0;
  const showOtherImages = data.otherImages != undefined && data.otherImages.length > 0;
  const showAltSites = data.alternateSites != undefined && data.alternateSites.length > 0;
  const showAltStreams = data.alternateStreams != undefined && data.alternateStreams.length > 0;
  const showSocialProfiles = data.socialProfiles != undefined && data.socialProfiles.length > 0;
  const showCallsigns = data.callsigns != undefined && data.callsigns.length > 0;
  const showContacts = data.contacts != undefined && data.contacts.length > 0;
  const showPolicies = data.policies != undefined && data.policies.length > 0;

  return (
    <List.Item.Detail
      markdown={`${showLogo ? `<img src="${data.logo}" alt="Station Logo" height="100" />\n` : ""}
${showLogo ? "---" : ""}
# ${stationName}

${data.slogan != undefined && data.slogan != "" ? data.slogan : ""}
## ${data.description == "" ? "No Description" : "Description:"}

    ${data.description}
    
${showOtherImages ? "## Images:\n" + data.otherImages.map((imageURL) => `![Station Image](${imageURL})`) : ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Genres">{tags}</List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Primary Links" />
          <List.Item.Detail.Metadata.Link title="Website" text={data.website} target={data.website} />
          <List.Item.Detail.Metadata.Link title="Stream" text={data.stream} target={data.stream} />

          {showAltSites ? <List.Item.Detail.Metadata.Separator /> : null}
          {showAltSites ? <List.Item.Detail.Metadata.Label title="Additional Websites" /> : null}
          {showAltSites
            ? data.alternateSites.map((siteData: WebsiteData) => (
                <List.Item.Detail.Metadata.Link title={siteData.title} text={siteData.url} target={siteData.url} />
              ))
            : null}

          {showAltStreams ? <List.Item.Detail.Metadata.Separator /> : null}
          {showAltStreams ? <List.Item.Detail.Metadata.Label title="Alternate Streams" /> : null}
          {showAltStreams
            ? data.alternateStreams.map((streamURL, index) => (
                <List.Item.Detail.Metadata.Link
                  title={`Alternate Stream #${index}`}
                  text={streamURL}
                  target={streamURL}
                />
              ))
            : null}

          {showSocialProfiles ? <List.Item.Detail.Metadata.Separator /> : null}
          {showSocialProfiles ? <List.Item.Detail.Metadata.Label title="Social Profiles" /> : null}
          {showSocialProfiles
            ? data.socialProfiles.map((socialProfile: SocialProfileData) => (
                <List.Item.Detail.Metadata.Link
                  title={socialProfile.type}
                  text={socialProfile.handle}
                  target={socialProfile.url}
                />
              ))
            : null}

          {showCallsigns ? <List.Item.Detail.Metadata.Separator /> : null}
          {showCallsigns ? <List.Item.Detail.Metadata.Label title="Call Signs" /> : null}
          {showCallsigns
            ? data.socialProfiles.map((socialProfile: SocialProfileData) => (
                <List.Item.Detail.Metadata.Link
                  title={socialProfile.type}
                  text={socialProfile.handle}
                  target={socialProfile.url}
                />
              ))
            : null}

          {showContacts ? <List.Item.Detail.Metadata.Separator /> : null}
          {showContacts ? <List.Item.Detail.Metadata.Label title="Contact Info" /> : null}
          {showContacts
            ? data.contacts.map((contactData: ContactData) => (
                <List.Item.Detail.Metadata.Label
                  title={contactData.title}
                  text={contactData.value}
                  icon={contactIcons[contactData.type]}
                />
              ))
            : null}

          {showPolicies ? <List.Item.Detail.Metadata.Separator /> : null}
          {showPolicies ? <List.Item.Detail.Metadata.Label title="Policies" /> : null}
          {showPolicies
            ? data.policies.map((policyData: PolicyData) => (
                <List.Item.Detail.Metadata.Link
                  title={policyData.title}
                  text={policyData.url}
                  target={policyData.url}
                />
              ))
            : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
