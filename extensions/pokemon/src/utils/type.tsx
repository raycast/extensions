import { readCSVtoMapping } from './parse_csv';
import { PokemonStatData } from './pokemon';
import { Request } from './request';
import path from 'path';

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
    const formedData = await Request(urlPokemonForm, 'GET', null, {});
    console.log('Pokemon Form finished.')
    // NOTE: 通过interface显示声明types的数据结构
    const types: Type[] = formedData.types;
    const typeNames = types.map(item => item.type.name);
    // NOTE:计算宝可梦作为被攻击方的属性相性
    const promises = types.map(async (item: Type) => {
        const typeUrl = item.type.url;
        const typeName = item.type.name;
        const result = await Request(typeUrl, "GET", null, {});
        return result
    });
    const results = await Promise.all(promises);
    console.log('Pokemon Types finished.')
    
    let damageResult: DamageResult = {
        from: {},
        to: {},
    };
    for (let i = 0; i < results.length; i++) {
        // 受到伤害
        const doubleDamageFrom = getAllTypeNames(results[i].damage_relations.double_damage_from);
        const halfDamageFrom = getAllTypeNames(results[i].damage_relations.half_damage_from);
        const noDamageFrom = getAllTypeNames(results[i].damage_relations.no_damage_from);
        // 攻击造成伤害
        const doubleDamageTo = getAllTypeNames(results[i].damage_relations.double_damage_to);
        const halfDamageTo = getAllTypeNames(results[i].damage_relations.half_damage_to);
        const noDamageTo = getAllTypeNames(results[i].damage_relations.no_damage_to);

        for (let j = 0; j < doubleDamageFrom.length; j++) {
            const type = doubleDamageFrom[j];
            damageResult.from[type] = (type in damageResult.from) ? (2 * damageResult.from[type]) : 2;
        }
        for (let j = 0; j < halfDamageFrom.length; j++) {
            const type = halfDamageFrom[j];
            damageResult.from[type] = (type in damageResult.from) ? (0.5 * damageResult.from[type]) : 0.5;
        }
        for (let j = 0; j < noDamageFrom.length; j++) {
            const type = noDamageFrom[j];
            damageResult.from[type] = 0;
        }
        for (let j = 0; j < doubleDamageTo.length; j++) {
            const type = doubleDamageTo[j];
            damageResult.to[type] = (type in damageResult.to) ? (2 * damageResult.to[type]) : 2;
        }
        for (let j = 0; j < halfDamageTo.length; j++) {
            const type = halfDamageTo[j];
            // damageResult.to[type] = (type in damageResult.to) ? (0.5 * damageResult.to[type]) : 0.5;
            // 如果是弱打击面, 但是之前已经判断过了的话, 就保持原来的不变: 原来是强就继续是强, 原来是弱就弱
            damageResult.to[type] = (type in damageResult.to) ? (damageResult.to[type]) : 0.5;  
        }
        for (let j = 0; j < noDamageTo.length; j++) {
            const type = noDamageTo[j];
            damageResult.to[type] = 0;
        }
    }

    const typesMappingFilePath = path.join(__dirname, '../pokemon-tools/assets', 'types_chn_eng.csv');
    const typesNameMapping = await readCSVtoMapping(typesMappingFilePath);
    // console.log('typeNames', typeNames);
    
    for (const i in typeNames) {
        let typeEnName = typeNames[i];
        let typeCnName = typesNameMapping[typeEnName];
        pokemonStatData.types.includes(typeCnName) || pokemonStatData.types.push(typeCnName);
    }

    console.log('damageResult:', damageResult);
    // 遍历属性相性结果, 写入各倍区
    
    for (const typeEnName in damageResult.from) {
        console.log('typeEnName', typeEnName);
        const typeCnName = typesNameMapping[typeEnName];
        const damageRatio = damageResult.from[typeEnName];
        // console.log(`typeCnName: ${typeCnName}, damageRatio: ${damageRatio}`);
        
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
            console.log('damage ratio calculate pass.')
        }
    }
    for (const typeEnName in damageResult.to) {
        const typeCnName = typesNameMapping[typeEnName];
        const damageRatio = damageResult.to[typeEnName];
        // console.log(`typeCnName: ${typeCnName}, damageRatio: ${damageRatio}`);

        if (damageRatio < 1 && ! (typeCnName in pokemonStatData.damage_relations.weak_damage_to)) {
            if (pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName)) {
                // 如果当前属性是弱打击, 之前有被记为强打击, 则保持强打击不变
            } else if (! pokemonStatData.damage_relations.weak_damage_to.includes(typeCnName)) {
                // 如果这个属性之前既不是弱打击, 也不是强打击, 则标记为弱打击
                pokemonStatData.damage_relations.weak_damage_to.push(typeCnName);
            } else {
                console.log('weak damage pass.');
            }
        }
        else if (damageRatio > 1 && ! (typeCnName in pokemonStatData.damage_relations.weak_damage_to)) {
            if (pokemonStatData.damage_relations.weak_damage_to.includes(typeCnName)) {
                // 如果当前属性是强打击, 之前有被记为弱打击, 则更新为强打击, 同时将弱打击中的标记去除
                pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName) || pokemonStatData.damage_relations.strong_damage_to.push(typeCnName);
                const idx = pokemonStatData.damage_relations.weak_damage_to.indexOf(typeCnName);
                pokemonStatData.damage_relations.weak_damage_to.splice(idx, 1);
            } else if (! pokemonStatData.damage_relations.strong_damage_to.includes(typeCnName)) {
                // 如果这个属性之前既不是强打击, 也不是弱打击, 则标记为强打击
                pokemonStatData.damage_relations.strong_damage_to.push(typeCnName);
            } else {
                console.log('strong damage pass.');
            }
        }
        // console.log('当前强打击:', pokemonStatData.damage_relations.strong_damage_to);
        // console.log('当前弱打击:', pokemonStatData.damage_relations.weak_damage_to);
        // console.log('=='.repeat(20));
    }

    return pokemonStatData

}