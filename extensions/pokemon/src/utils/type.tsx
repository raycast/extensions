import { readCSVtoMapping } from './parse_csv';
import { PokemonStatData } from './pokemon';
import { Request } from './request';
import path from 'path';
import fs from 'fs';

export const typeMapping = {
    normal: "一般",
    flying: "飞行",
    fire: "火",
    psychic: "超能力",
    water: "水",
    bug: "虫",
    electric: "电",
    rock: "岩石",
    grass: "草",
    ghost: "幽灵",
    ice: "冰",
    dragon: "龙",
    fighting: "格斗",
    dark: "恶",
    poison: "毒",
    steel: "钢",
    ground: "地面",
    fairy: "妖精",
}

export const damageTypeMapping = {
    physical: "物理",
    special: "特殊",
    status: "变化",
}

interface Detail {
    name: string,
    url: string,
}

interface Type {
    slot: number,
    type: Detail,
}

// type DamageResult = {
//     [key: string]: number
// }
type DamageResult = {
    from: {
        [key: string]: number
    },
    to: {
        [key: string]: number
    }
}

function getAllTypeNames(type_detail: Detail[]) {
    return type_detail.map(item => item.name);
}


export async function GetTypes(id: string, pokemonStatData: PokemonStatData) {
    const urlPokemonForm = `https://pokeapi.co/api/v2/pokemon-form/${id}`;
    let formedData = await Request(urlPokemonForm, 'GET', null, {});
    console.log('Pokemon Form finished.')
    // NOTE: 通过interface显示声明types的数据结构
    const types: Type[] = formedData.types;
    const typeUrls = types.map(item => item.type.url);
    const typeNames = types.map(item => item.type.name);
    // NOTE:计算宝可梦作为被攻击方的属性相性
    var promises = types.map(async (item: Type) => {
        let typeUrl = item.type.url;
        let typeName = item.type.name;
        let result = await Request(typeUrl, "GET", null, {});
        return result
    });
    var results = await Promise.all(promises);
    console.log('Pokemon Types finished.')
    
    var damageResult: DamageResult = {
        from: {},
        to: {},
    };
    for (let i = 0; i < results.length; i++) {
        // 受到伤害
        let doubleDamageFrom = getAllTypeNames(results[i].damage_relations.double_damage_from);
        let halfDamageFrom = getAllTypeNames(results[i].damage_relations.half_damage_from);
        let noDamageFrom = getAllTypeNames(results[i].damage_relations.no_damage_from);
        // 攻击造成伤害
        let doubleDamageTo = getAllTypeNames(results[i].damage_relations.double_damage_to);
        let halfDamageTo = getAllTypeNames(results[i].damage_relations.half_damage_to);
        let noDamageTo = getAllTypeNames(results[i].damage_relations.no_damage_to);

        for (let j = 0; j < doubleDamageFrom.length; j++) {
            let type = doubleDamageFrom[j];
            damageResult.from[type] = (type in damageResult.from) ? (2 * damageResult.from[type]) : 2;
        }
        for (let j = 0; j < halfDamageFrom.length; j++) {
            let type = halfDamageFrom[j];
            damageResult.from[type] = (type in damageResult.from) ? (0.5 * damageResult.from[type]) : 0.5;
        }
        for (let j = 0; j < noDamageFrom.length; j++) {
            let type = noDamageFrom[j];
            damageResult.from[type] = 0;
        }
        for (let j = 0; j < doubleDamageTo.length; j++) {
            let type = doubleDamageTo[j];
            damageResult.to[type] = (type in damageResult.to) ? (2 * damageResult.to[type]) : 2;
        }
        for (let j = 0; j < halfDamageTo.length; j++) {
            let type = halfDamageTo[j];
            // damageResult.to[type] = (type in damageResult.to) ? (0.5 * damageResult.to[type]) : 0.5;
            // 如果是弱打击面, 但是之前已经判断过了的话, 就保持原来的不变: 原来是强就继续是强, 原来是弱就弱
            damageResult.to[type] = (type in damageResult.to) ? (damageResult.to[type]) : 0.5;  
        }
        for (let j = 0; j < noDamageTo.length; j++) {
            let type = noDamageTo[j];
            damageResult.to[type] = 0;
        }
    }

    let typesMappingFilePath = path.join(__dirname, '../pokemon-tools/assets', 'types_chn_eng.csv');
    let typesNameMapping = await readCSVtoMapping(typesMappingFilePath);
    // console.log('typeNames', typeNames);
    
    for (let i in typeNames) {
        let typeEnName = typeNames[i];
        let typeCnName = typesNameMapping[typeEnName];
        pokemonStatData.types.includes(typeCnName) || pokemonStatData.types.push(typeCnName);
    }

    console.log('damageResult:', damageResult);
    // 遍历属性相性结果, 写入各倍区
    
    for (let typeEnName in damageResult.from) {
        let typeCnName = typesNameMapping[typeEnName];
        let damageRatio = damageResult.from[typeEnName];
        // console.log(`typeCnName: ${typeCnName}, damageRatio: ${damageRatio}`);
        if (damageResult.from.hasOwnProperty(typeEnName)) {
            if (damageRatio === 0.25 && ! (typeCnName in pokemonStatData.damage_relations.quarter_damage_from)) {
                pokemonStatData.damage_relations.quarter_damage_from.includes(typeCnName) || pokemonStatData.damage_relations.quarter_damage_from.push(typeCnName);
            } else if (damageRatio === 0.5 && ! (typeCnName in pokemonStatData.damage_relations.quarter_damage_from)) {
                pokemonStatData.damage_relations.half_damage_from.includes(typeCnName) || pokemonStatData.damage_relations.half_damage_from.push(typeCnName);
            } else if (damageRatio === 2 && ! (typeCnName in pokemonStatData.damage_relations.quarter_damage_from)) {
                pokemonStatData.damage_relations.double_damage_from.includes(typeCnName) || pokemonStatData.damage_relations.double_damage_from.push(typeCnName);
            } else if (damageRatio === 4 && ! (typeCnName in pokemonStatData.damage_relations.quarter_damage_from)) {
                pokemonStatData.damage_relations.quadruple_damage_from.includes(typeCnName) || pokemonStatData.damage_relations.quadruple_damage_from.push(typeCnName);
            } else if (damageRatio === 0 && ! (typeCnName in pokemonStatData.damage_relations.quarter_damage_from)) {
                pokemonStatData.damage_relations.none_damage_from.includes(typeCnName) || pokemonStatData.damage_relations.none_damage_from.push(typeCnName);
            }
            else {
            }
        }
    }
    for (let typeEnName in damageResult.to) {
        let typeCnName = typesNameMapping[typeEnName];
        let damageRatio = damageResult.to[typeEnName];
        // console.log(`typeCnName: ${typeCnName}, damageRatio: ${damageRatio}`);

        if (damageResult.to.hasOwnProperty(typeEnName)) {
            if (damageRatio < 1 && ! (typeCnName in pokemonStatData.damage_relations.weak_damage_to)) {
                if (pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName)) {
                    // 如果当前属性是弱打击, 之前有被记为强打击, 则保持强打击不变
                } else if (! pokemonStatData.damage_relations.weak_damage_to.includes(typeCnName)) {
                    // 如果这个属性之前既不是弱打击, 也不是强打击, 则标记为弱打击
                    pokemonStatData.damage_relations.weak_damage_to.push(typeCnName);
                } else {

                }
            }
            else if (damageRatio > 1 && ! (typeCnName in pokemonStatData.damage_relations.weak_damage_to)) {
                if (pokemonStatData.damage_relations.weak_damage_to.includes(typeCnName)) {
                    // 如果当前属性是强打击, 之前有被记为弱打击, 则更新为强打击, 同时将弱打击中的标记去除
                    pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName) || pokemonStatData.damage_relations.strong_damage_to.push(typeCnName);
                    let idx = pokemonStatData.damage_relations.weak_damage_to.indexOf(typeCnName);
                    pokemonStatData.damage_relations.weak_damage_to.splice(idx, 1);
                } else if (! pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName)) {
                    // 如果这个属性之前既不是强打击, 也不是弱打击, 则标记为强打击
                    pokemonStatData.damage_relations.strong_damage_to.push(typeCnName);
                } else {
                }
            }
        }
        // console.log('当前强打击:', pokemonStatData.damage_relations.strong_damage_to);
        // console.log('当前弱打击:', pokemonStatData.damage_relations.weak_damage_to);
        // console.log('=='.repeat(20));
    }

    return pokemonStatData

}