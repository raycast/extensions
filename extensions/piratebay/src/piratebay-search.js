const cheerio = require('cheerio')
const nodeFetch = require('node-fetch')

const proxies = [
	'https://pirateproxy.cam',
	'https://piratebay2.org',
	'https://thehiddenbay.com',
	'https://thepiratebay.wtf',
	'https://piratebay.kim/',
	'https://tpb.lc/',
	'https://thepiratebay.sh/',
	'https://pirateproxy.tel/',
	'https://bayproxy.click/',
	'https://piratebays.red/',
	'https://thepiratebay.love/',
	'https://thepiratebay.nz/',
	'https://piratebays.one/',
	'https://piratebays.pw/',
	'https://proxyproxy.org/',
	'https://piratepirate.be/',
	'https://proxybay.tel/',
	'https://tpbproxy.bz/',
	'https://baypirate.org/',
	'https://bayproxy.club/',
	'https://proxybay.nu/',
	'https://piratebays.click/',
	'https://pirateproxy.be/',
	'https://piratebay-proxylist.se/',
	'https://pirateproxy.wtf/',
	'https://www.pirateproxy.space/',
	'https://proxybay.live/',
	'https://tpbproxy.nl/'
]

function getProxyList({fetch = nodeFetch} = {}) {
	return fetch('https://piratebay-proxylist.se/api/v1/proxies')
		.then(res => res.json())
		.then(json => json.proxies.map(proxy => `${proxy.secure ? 'https' : 'https'}://${proxy.domain}/`) || [])
		.then(domains => [...new Set(domains.concat(proxies))])
		.catch(err => {
			throw err;
		})
}

function isUp (url, {fetch = nodeFetch, wait = 2000} = {}) {
	return new Promise((resolve, reject) => {
		fetch(url, {method: 'HEAD'}).then(res => {
			resolve({url, up: res.status >= 200 && res.status < 400})
		})
		.catch(reject)

		setTimeout(() => resolve({url, up: false}), wait)
	})
}

async function checkIsUp ({fetch = nodeFetch, wait = 2000, urls = ['https://thepiratebay.org']} = {}) {
	const proxyList = await getProxyList();
	const proxyPromises = urls.concat(proxyList).map(url => isUp(url, {fetch, wait}))
	return Promise.all(proxyPromises)
}

async function searchPages (q = '', {fetch = nodeFetch, baseURL = 'https://thepiratebay.org', sortby = '7'} = {}) {
	if (!fetch) {
		throw new Error('piratebay-search: No fetch implementation provided')
	}

	if (!q || typeof q !== 'string' || q.length === 0) {
		throw new Error('piratebay-search: Please provide valid search query')
	}

	const url = `${baseURL}/search/${encodeURIComponent(q)}/0/${sortby}/0`
	const res = await fetch(url)
	const text = await res.text()

	const $ = cheerio.load(text)
	
	const pageNumbers = $("table[id='searchResult'] tr").last().text().split('\n').join('').split(' ').filter(item => item)// empty Array entries are removed
	
	const pages = []
	
	pageNumbers.forEach(element => {
		if (/^-?\d+$/.test(element)) { // check if last element on page are numbers
			const pageEntry = {
				value: element,
				title: 'Page ' + element
			}
			pages.push(pageEntry)
		} else if (pages.length === 0) {
			pages.push({
				value: "1",
				title: "Page 1"
			})
		}
	})
	return pages
}

async function search (q = '', {fetch = nodeFetch, baseURL = 'https://thepiratebay.org', page = 0, category = 0, sortby = '7'} = {}) {
	if (!fetch) {
		throw new Error('piratebay-search: No fetch implementation provided')
	}

	if (!q || typeof q !== 'string' || q.length === 0) {
		throw new Error('piratebay-search: Please provide valid search query')
	}

	if (page === undefined || !Number.isInteger(page)) {
		throw new Error(`piratebay-search: Invalid page of ${page} provided`)
	}

	const url = `${baseURL}/search/${encodeURIComponent(q)}/${page}/${sortby}/${category}`
	const res = await fetch(url)
	const text = await res.text()

	const $ = cheerio.load(text)

	const torrents = []

	$("table[id='searchResult'] tr").each(function () {
		const icons = [];
		var hasComments = $(this).find('td').find('img').each(function(i, link) {
			var icon = $(link).attr('src')
			if (icon !== undefined) {
				icons.push($(link).attr('src').split('/').pop().replace(/\..*/g, ''))
			}
		});
		var commentsCount = ""
		if (icons.includes('icon_comment')) {
			var hasComments = $(this).find('td').find('img').each(function(i, link) {
			var icon = $(link).attr('title')
			if (icon !== undefined && icon !== '') {
				commentsCount += $(link).attr('title').replace(/[^0-9]/g, '')
			}
			
// 				console.log(commentsCountt)
		});
		}
		
		const torrent = {
			name: $(this).find('a.detLink').text(),
			link: $(this).find('a.detLink').attr('href'),
			seeds: $(this).children('td:nth-child(3)').text(),
			peers: $(this).children('td:nth-child(4)').text(),
			description: $(this).find('font.detDesc').text(),
			file: $(this).find('a[href^="magnet"]').attr('href'),
			vip: icons.includes('vip'),
			trusted: icons.includes('trusted'),
			comments: icons.includes('icon_comment'),
			commentsCount: commentsCount
		}
		torrents.push(torrent)
	})
	return torrents
}

module.exports = {
	getProxyList,
	checkIsUp,
	search,
	searchPages
}