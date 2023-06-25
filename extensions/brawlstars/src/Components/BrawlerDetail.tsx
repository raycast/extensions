import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import brawlers from "../../statics/FullBrawlersInfo.json";
interface IBrawlerIdProps {
  id: string;
}

const BrawlerComponent = ({ id }: IBrawlerIdProps) => {
  const brawlerData = brawlers.list.find((brawler) => "" + brawler.id == id);

  if (!brawlerData) {
    return <Detail markdown="No Brawler Found!" />;
  }

  const markdown = `
  # ${brawlerData.name} 

  <img src="${brawlerData.imageUrl2}"  width="100" height="100" /> 
  
  ## Description
  ${brawlerData.description}


  ## <img src="${brawlerData.starPowers[0].imageUrl}" alt= "star power" width="20" height="20">  Star Powers



  ### ${brawlerData.starPowers[0].name}
  
  
  ${brawlerData.starPowers[0].description}



  ### ${brawlerData.starPowers[1].name}


  ${brawlerData.starPowers[1].description}
  
  
  ## <img src="${brawlerData.gadgets[0].imageUrl}" alt= "gadget" width="20" height="20">  Gadgets
  
  ###  ${brawlerData.gadgets[0].name}

  
${brawlerData.gadgets[0].description}




  ### ${brawlerData.gadgets[1].name}


  ${brawlerData.gadgets[1].description}


  
  `;
  return (
    <>
      <Detail
        markdown={markdown}
        navigationTitle={"Player Info | " + brawlerData.name}
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
