import { PokemonStatData } from './pokemon';
import { Request } from './request';

// 最细粒度接口对象结构, 包含name和url两个key
interface Detail {
    name: string,
    url: string,
}

interface Ability {
    ability: {
        name: string,
        url: string,
    },
    is_hidden: boolean,
    slot: number
}

// 特性多语言翻译
interface AbilityDetailLanguageName {
    language: Detail,
    name: string
}

// 特性效果条目(多语言)
interface AbilityFlavorTextEntry {
    flavor_text: string,
    language: Detail,
    version_group: Detail,
}

// 特性详情
interface AbilityFlavorDetail {
    id: number,
    flavor_text_entries: AbilityFlavorTextEntry[],
    names: AbilityDetailLanguageName[],
}

export interface AbilityDetail {
    name: string,
    effect: string,
    hidden: boolean,
}


interface TotalInfo {
    abilities: Ability[]
}

// 获取特性详情
export async function GetAbility(id: string, totalInfo: TotalInfo, pokemonStatData: PokemonStatData, name: string) {
    const urlPokemonAbilities = `https://pokeapi.co/api/v2/ability/${id}`;
    let abilityDetails : AbilityDetail[] = [];
    let promises = totalInfo.abilities.map(async (ability: Ability) => {
        let abilityUrl = ability.ability.url;
        let result = await Request(abilityUrl, "GET", null, {});
        let is_hidden = ability.is_hidden;
        return {is_hidden, result}
    });
    let results = await Promise.all(promises);
    results.sort();
    console.log('Pokemon Abilities finished.')
    for (let i = 0; i < results.length; i++) {
        let abilityDetail: AbilityFlavorDetail = results[i].result;
        let is_hidden: boolean = results[i].is_hidden;
        // console.log('abilityDetail.names:', abilityDetail.names);
        let cn_name_lst = (
            abilityDetail.names.filter(item => item.language.name === "zh-Hans" ? item.name : "") || 
            abilityDetail.names.filter(item => item.language.name === "zh-Hant" ? item.name : "") ||
            abilityDetail.names.filter(item => item.language.name === "en" ? item.name : "")
        )
        // console.log('abilityDetail.flavor_text_entries:', abilityDetail.flavor_text_entries);
        let cn_effect_lst = (
            abilityDetail.flavor_text_entries.filter(item => item.language.name === "zh-Hans" ? item.flavor_text : "") ||
            abilityDetail.flavor_text_entries.filter(item => item.language.name === "zh-Hant" ? item.flavor_text : "") ||
            abilityDetail.flavor_text_entries.filter(item => item.language.name === "en" ? item.flavor_text : "")
        )
        abilityDetails.push({
            name: cn_name_lst[0].name,
            effect: cn_effect_lst[0].flavor_text.replace(/\r\n/g,""),
            hidden: is_hidden
        });
    }
    pokemonStatData.abilities = abilityDetails;
    return pokemonStatData
}