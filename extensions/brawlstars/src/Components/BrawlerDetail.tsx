import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import IBrawlers from "../models/IBrawler";

interface IBrawlerProps {
  brawlerData: IBrawlers;
}

const BrawlerComponent = ({ brawlerData }: IBrawlerProps) => {
  if (brawlerData.name == "") {
    return (
      <List>
        <List.EmptyView title="No Brawler Found" icon={Icon.ExclamationMark} description="No data found" />
      </List>
    );
  }

  const markdown = `
  # ${brawlerData.name} 

  <img src="${brawlerData.imageUrl2}"  width="100" height="100" /> 
  
  ## Description
  ${brawlerData.description}


  ## <img src="${
    brawlerData.starPowers[0]?.imageUrl ?? Icon.ExclamationMark
  }" alt= "star power" width="20" height="20">  Star Powers



  ### ${brawlerData.starPowers[0]?.name ?? "No star power n°1"}
  
  
  ${brawlerData.starPowers[0]?.description ?? "No description"}



  ### ${brawlerData.starPowers[1]?.name ?? "No star power n°2"}


  ${brawlerData.starPowers[1]?.description ?? "No description"}
  
  
  ## <img src="${
    brawlerData.gadgets[0]?.imageUrl ?? Icon.ExclamationMark
  }" alt= "gadget" width="20" height="20">  Gadgets
  
  ###  ${brawlerData.gadgets[0]?.name ?? "No gadget n°1"}

  
${brawlerData.gadgets[0]?.description ?? "No description"}




  ### ${brawlerData.gadgets[1]?.name ?? "No gadget n°2"}


  ${brawlerData.gadgets[1]?.description ?? "No description"}


  
  `;
  return (
    <>
      <Detail
        markdown={markdown}
        navigationTitle={"Brawler Info | " + brawlerData.name}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Class">
              <Detail.Metadata.TagList.Item icon={Icon.Switch} text={brawlerData.class.name} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />

            <Detail.Metadata.TagList title="Rarity">
              <Detail.Metadata.TagList.Item
                icon={Icon.Star}
                text={brawlerData.rarity.name}
                color={brawlerData.rarity.color}
              />
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="More Info" target={brawlerData.link} text={brawlerData.name} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Brawlify" icon={Icon.Globe} url={brawlerData.link} />
          </ActionPanel>
        }
      />
    </>
  );
};

export default BrawlerComponent;
