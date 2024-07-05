import { Detail, List } from "@raycast/api";
import { GetPokemonStats } from "./utils/pokemon";
import { IconList } from "./utils/iconlist";
// import { mapping.cnColorMapping, enColorMapping, damageTypeColorMapping } from "./utils/color_mapping";
import * as mapping from "./utils/color_mapping";

interface Argument {
  fallbackText: string;
  arguments: {
    name: string;
  };
  launchType: string;
  launchContext: string;
}

interface AttrInfo {
  text: string;
  icon: string;
}

export default function ShowPokemonStats(props: Argument) {
  const name = props.arguments.name;
  const { pokemonStatData, loading } = GetPokemonStats(name);
  if (loading) {
    return <Detail markdown="# 结果查询中..." />;
  } else {
    // DEBUG:
    // console.log("返回结果:", pokemonStatData);
    const hp = pokemonStatData.base_stats.hp?.toLocaleString();
    const attack = pokemonStatData.base_stats.attack?.toLocaleString();
    const defense = pokemonStatData.base_stats.defense?.toLocaleString();
    const special_attack = pokemonStatData.base_stats.special_attack?.toLocaleString();
    const special_defense = pokemonStatData.base_stats.special_defense?.toLocaleString();
    const speed = pokemonStatData.base_stats.speed?.toLocaleString();
    const total = pokemonStatData.base_stats.total?.toLocaleString();
    const attrInfo: AttrInfo[] = pokemonStatData.types.map((item) => ({ text: item, icon: `types/${item}.svg` })); // NOTE: 返回的对象一定要用括号括起来!

    const moves = pokemonStatData.moves;

    const moveDetail = moves?.map((item) => (
      <List.Item.Detail.Metadata.TagList title={`${item.level}-${item.cn_name}`}>
        <List.Item.Detail.Metadata.TagList.Item text={`${item.type}`} color={mapping.cnColorMapping[`${item.type}`]} />
        <List.Item.Detail.Metadata.TagList.Item
          text={`${item.damage_class}`}
          color={mapping.damageTypeColorMapping[`${item.damage_class}`]}
        />
        <List.Item.Detail.Metadata.TagList.Item text={`${item.power}`} />
        <List.Item.Detail.Metadata.TagList.Item text={`${item.accuracy}`} />
        <List.Item.Detail.Metadata.TagList.Item text={`${item.pp}`} />
      </List.Item.Detail.Metadata.TagList>
    ));

    const abilityDetail = pokemonStatData.abilities?.map((item) =>
      // <List.Item.Detail.Metadata.Label title={`${item.name}`} text={`${item.effect}`}/>
      [
        <List.Item.Detail.Metadata.Label title={`${item.name}`} text={`${item.effect}`} />,
        // <List.Item.Detail.Metadata.Label title={`${item.name}`}/>,
        // <List.Item.Detail.Metadata.Label title={`${item.effect}`}/>
      ],
    );

    return (
      <List isLoading={loading} isShowingDetail>
        <List.Item
          icon={IconList.name}
          title="名字"
          accessories={[{ text: `${pokemonStatData.name}` }]}
          detail={<List.Item.Detail markdown={`![illustration](${pokemonStatData.image})`} />}
        />
        <List.Item
          icon={IconList.number}
          title="编号"
          accessories={[
            { text: `${pokemonStatData.id}` },
            // {tag: {value: `${pokemonStatData.generation}`, color: mapping.generationColorMapping[`${pokemonStatData.generation}`]}},
          ]}
        />
        <List.Item
          icon={IconList.generation}
          title="地区"
          accessories={[
            {
              tag: {
                value: `${pokemonStatData.generation}`,
                color: mapping.generationColorMapping[`${pokemonStatData.generation}`],
              },
            },
          ]}
        />
        <List.Item
          icon={IconList.stat}
          title="种族值"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="生命">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.hp / 10)}
                      color={"#8AC653"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={hp} color={"#8AC653"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="攻击">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.attack / 10)}
                      color={"#F8CB3B"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={attack} color={"#F8CB3B"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="防御">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.defense / 10)}
                      color={"#D98837"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={defense} color={"#D98837"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="特攻">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.special_attack / 10)}
                      color={"#58C3D0"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={special_attack} color={"#58C3D0"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="特防">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.special_defense / 10)}
                      color={"#5890CD"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={special_defense} color={"#5890CD"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="速度">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={"█".repeat(pokemonStatData.base_stats.speed / 10)}
                      color={"#A456CF"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={speed} color={"#A456CF"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="总和">
                    <List.Item.Detail.Metadata.TagList.Item text={total} color={"#FF9CC4"} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
        <List.Item
          icon={IconList.types}
          title="属性"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="弱点" />
                  <List.Item.Detail.Metadata.TagList title="受到4倍伤害">
                    {pokemonStatData.damage_relations.quadruple_damage_from.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="受到2倍伤害">
                    {pokemonStatData.damage_relations.double_damage_from.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="抗性" />
                  <List.Item.Detail.Metadata.TagList title="受到1/2倍伤害">
                    {pokemonStatData.damage_relations.half_damage_from.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="受到1/4倍伤害">
                    {pokemonStatData.damage_relations.quarter_damage_from.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="免疫伤害">
                    {pokemonStatData.damage_relations.none_damage_from.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="打击面" />
                  <List.Item.Detail.Metadata.TagList title="强打">
                    {pokemonStatData.damage_relations.strong_damage_to.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="弱打">
                    {pokemonStatData.damage_relations.weak_damage_to.map((item) => (
                      <List.Item.Detail.Metadata.TagList.Item text={item} color={mapping.cnColorMapping[item]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          accessories={attrInfo}
        />
        <List.Item
          icon={IconList.ability}
          title="特性"
          detail={
            <List.Item.Detail
              metadata={
                // <List.Item.Detail.Metadata>
                //     <Detail.Metadata.Label title="1. 激流"/>
                //     <Detail.Metadata.Label title="ＨＰ減少的時候，\n水屬性的招式威力會提高。"/>
                //     <Detail.Metadata.Label title="2. 雨盤"/>
                //     <Detail.Metadata.Label title="天氣為下雨時，\n會漸漸回復ＨＰ"/>
                // </List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata>{abilityDetail}</List.Item.Detail.Metadata>
              }
            />
          }
        />
        <List.Item
          icon={IconList.moves}
          title="技能"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="等级-技能">
                    <List.Item.Detail.Metadata.TagList.Item text="属性" color="magenta" />
                    <List.Item.Detail.Metadata.TagList.Item text="分类" color="skyblue" />
                    <List.Item.Detail.Metadata.TagList.Item text="威力" color="green" />
                    <List.Item.Detail.Metadata.TagList.Item text="命中" color="orange" />
                    <List.Item.Detail.Metadata.TagList.Item text="pp" color="pink" />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  {moveDetail}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List>
    );
  }
}
