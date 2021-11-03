 var tld = require('tldjs'),
 tough = require('tough-cookie'),
 request = require('request'),
 int = require('int'),
 url = require('url'),
 crypto = require('crypto'),
 os = require('os'),
 fs = require('fs'),
 dpapi,
 Cookie = tough.Cookie,
 path,
 ITERATIONS,
 dbClosed = false;

 const { exec } = require("child_process");

import {
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
} from "@raycast/api";

 var	KEYLENGTH = 16,
 SALT = 'saltysalt'


function decrypt(key, encryptedData) {

	var decipher,
	decoded,
	final,
	padding,
	iv = new Buffer.from(new Array(KEYLENGTH + 1).join(' '), 'binary');

	decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	decipher.setAutoPadding(false);

	encryptedData = encryptedData.slice(3);

	decoded = decipher.update(encryptedData);

	final = decipher.final();
	final.copy(decoded, decoded.length - 1);

	padding = decoded[decoded.length - 1];
	if (padding) {
		decoded = decoded.slice(0, decoded.length - padding);
	}

	decoded = decoded.toString('utf8');

	return decoded;

}

async function getDerivedKey(callback) {

	var keytar,
	chromePassword;

	chromePassword = await getLocalStorageItem("CHROME_PASSWORD");
  	if(!chromePassword){
  		if (process.platform === 'darwin') {
			var keychain = require('keychain');
			keychain.getPassword({ account: 'Chrome', service: 'Chrome Safe Storage' }, async function(err, chromePassword) {
				if(typeof chromePassword === 'string'){
				  	await setLocalStorageItem("CHROME_PASSWORD", chromePassword)
				  	crypto.pbkdf2(chromePassword, SALT, ITERATIONS, KEYLENGTH, 'sha1', callback);
				} else {
					callback('Keychain Access Denied')
				}				
			});	
		} 
  	} else {
  		crypto.pbkdf2(chromePassword, SALT, ITERATIONS, KEYLENGTH, 'sha1', callback);
  	}

}

// Chromium stores its timestamps in sqlite on the Mac using the Windows Gregorian epoch
// https://github.com/adobe/chromium/blob/master/base/time_mac.cc#L29
// This converts it to a UNIX timestamp

function convertChromiumTimestampToUnix(timestamp) {

	return int(timestamp.toString()).sub('11644473600000000').div(1000000);

}

function convertRawToNetscapeCookieFileFormat(cookies, domain) {

	var out = '',
	cookieLength = cookies.length;

	cookies.forEach(function (cookie, index) {

		out += cookie.host_key + '\t';
		out += ((cookie.host_key === '.' + domain) ? 'TRUE' : 'FALSE') + '\t';
		out += cookie.path + '\t';
		out += (cookie.is_secure ? 'TRUE' : 'FALSE') + '\t';

		if (cookie.has_expires) {
			out += convertChromiumTimestampToUnix(cookie.expires_utc).toString() + '\t';
		} else {
			out += '0' + '\t';
		}

		out += cookie.name + '\t';
		out += cookie.value + '\t';

		if (cookieLength > index + 1) {
			out += '\n';
		}

	});

	return out;

}

function convertRawToHeader(cookies) {

	var out = '',
	cookieLength = cookies.length;

	cookies.forEach(function (cookie, index) {

		out += cookie.name + '=' + cookie.value;
		if (cookieLength > index + 1) {
			out += '; ';
		}

	});

	return out;

}

function convertRawToJar(cookies, uri) {

	var jar = new request.jar();

	cookies.forEach(function (cookie, index) {

		var jarCookie = request.cookie(cookie.name + '=' + cookie.value);
		if (jarCookie) {
			jar.setCookie(jarCookie, uri);
		}

	});

	return jar;

}

function convertRawToSetCookieStrings(cookies) {

	var cookieLength = cookies.length,
	strings = [];

	cookies.forEach(function(cookie, index) {

		var out = '';

		var dateExpires = new Date(convertChromiumTimestampToUnix(cookie.expires_utc) * 1000);

		out += cookie.name + '=' + cookie.value + '; ';
		out += 'expires=' + tough.formatDate(dateExpires) + '; ';
		out += 'domain=' + cookie.host_key + '; ';
		out += 'path=' + cookie.path;

		if (cookie.is_secure) {
			out += '; Secure';
		}

		if (cookie.is_httponly) {
			out += '; HttpOnly';
		}

		strings.push(out);

	});

	return strings;

}

function convertRawToPuppeteerState(cookies) {

	let puppeteerCookies = [];
	
	cookies.forEach(function(cookie, index) {
		const newCookieObject = {
			name: cookie.name,
			value: cookie.value,
			expires: cookie.expires_utc,
			domain: cookie.host_key,
			path: cookie.path
		}
		if (cookie.is_secure) {
			newCookieObject['Secure'] = true
		}
		if (cookie.is_httponly) {
			newCookieObject['HttpOnly'] = true
		}
		puppeteerCookies.push(newCookieObject)
	})

	return puppeteerCookies;
}

function convertRawToObject(cookies) {

	var out = {};

	cookies.forEach(function (cookie, index) {
		out[cookie.name] = cookie.value;
	});

	return out;

}

function decryptAES256GCM(key, enc, nonce, tag) {
	const algorithm = 'aes-256-gcm';
	const decipher = crypto.createDecipheriv(algorithm, key, nonce);
	decipher.setAuthTag(tag);
	let str = decipher.update(enc,'base64','utf8');
	str += decipher.final('utf-8');
	return str;
}

/*

Possible formats:
curl - Netscape HTTP Cookie File contents usable by curl and wget http://curl.haxx.se/docs/http-cookies.html
jar - request module compatible jar https://github.com/request/request#requestjar
set-cookie - Array of set-cookie strings
header - "cookie" header string
puppeteer - array of cookie objects that can be loaded straight into puppeteer setCookie(...)
object - key/value of name/value pairs, overlapping names are overwritten

*/

const getCookies = async (uri, format, callback, profile) => {

	profile ? profile : profile = 'Default'

	if (process.platform === 'darwin') {

		path = process.env.HOME + `/Library/Application Support/Google/Chrome/${profile}/Cookies`;
		ITERATIONS = 1003;

	} else {

		return callback('Only Mac, Windows, and Linux are supported.');

	}

	

	if (format instanceof Function) {
		callback = format;
		format = null;
	}

	var parsedUrl = url.parse(uri);

	if (!parsedUrl.protocol || !parsedUrl.hostname) {

		return callback('Could not parse URI, format should be http://www.example.com/path/');
	}


	getDerivedKey(async function (err, derivedKey) {

		if (err) {
			await removeLocalStorageItem("CHROME_PASSWORD");
			return callback(err);
		}

		var cookies = [];

		var domain = tld.getDomain(uri);

		if (!domain) {
			return callback('Could not parse domain from URI, format should be http://www.example.com/path/');
		}

		const sqliteQuery = "sqlite3 '"+path+"' --json 'SELECT host_key, path, is_secure, expires_utc, name, value, hex(encrypted_value) as encrypted_value, creation_utc, is_httponly, has_expires, is_persistent FROM cookies where host_key like \"%"+domain+"\" ORDER BY LENGTH(path) DESC, creation_utc ASC;'";

		
		exec(sqliteQuery, (error, stdout, stderr) => {
			if (error) {
				callback(error)
				return;
			}
			if (stderr) {
				callback(stderr)
				return;
			}

			exec('sqlite3 .exit', (error, stdout, stderr) => {})


			

			const jsonTable = JSON.parse(stdout)

			jsonTable.forEach(function (cookie){
				
				var encryptedValue,
				value;


				if (cookie.value === '' && cookie.encrypted_value.length > 0) {
					encryptedValue = Buffer.from(cookie.encrypted_value,"hex");

					if (process.platform === 'win32') {
						if (encryptedValue[0] == 0x01 && encryptedValue[1] == 0x00 && encryptedValue[2] == 0x00 && encryptedValue[3] == 0x00){
							cookie.value = dpapi.unprotectData(encryptedValue, null, 'CurrentUser').toString('utf-8');

						} else if (encryptedValue[0] == 0x76 && encryptedValue[1] == 0x31 && encryptedValue[2] == 0x30 ){
							localState = JSON.parse(fs.readFileSync(os.homedir() + '/AppData/Local/Google/Chrome/User Data/Local State'));
							b64encodedKey = localState.os_crypt.encrypted_key;
							encryptedKey = new Buffer.from(b64encodedKey,'base64');
							key = dpapi.unprotectData(encryptedKey.slice(5, encryptedKey.length), null, 'CurrentUser');
							nonce = encryptedValue.slice(3, 15);
							tag = encryptedValue.slice(encryptedValue.length - 16, encryptedValue.length);
							encryptedValue = encryptedValue.slice(15, encryptedValue.length - 16);
							cookie.value = decryptAES256GCM(key, encryptedValue, nonce, tag).toString('utf-8');
						}
					} else {
						cookie.value = decrypt(derivedKey, encryptedValue);							
					}

					delete cookie.encrypted_value;
				}

				cookies.push(cookie);
			});

			var host = parsedUrl.hostname,
			path = parsedUrl.path,
			isSecure = parsedUrl.protocol.match('https'),
			cookieStore = {},
			validCookies = [],
			output;

			cookies.forEach(function (cookie) {

				if (cookie.is_secure && !isSecure) {
					return;
				}

				if (!tough.domainMatch(host, cookie.host_key, true)) {
					return;
				}

				if (!tough.pathMatch(path, cookie.path)) {
					return;
				}

				validCookies.push(cookie);

			});

			var filteredCookies = [];
			var keys = {};

			validCookies.reverse().forEach(function (cookie) {

				if (typeof keys[cookie.name] === 'undefined') {
					filteredCookies.push(cookie);
					keys[cookie.name] = true;
				}

			});

			validCookies = filteredCookies.reverse();

			switch (format) {

				case 'curl':
				output = convertRawToNetscapeCookieFileFormat(validCookies, domain);
				break;

				case 'jar':
				output = convertRawToJar(validCookies, uri);
				break;

				case 'set-cookie':
				output = convertRawToSetCookieStrings(validCookies);
				break;

				case 'header':
				output = convertRawToHeader(validCookies);
				break;

				case 'puppeteer':
				output = convertRawToPuppeteerState(validCookies)
				break;

				default:
				output = convertRawToObject(validCookies);
				break;
			}

			callback(false, cookies);

		});
	});

};



const getDomains = async (host_key, format, callback, profile) => {

	profile ? profile : profile = 'Default'

	if (process.platform === 'darwin') {

		path = process.env.HOME + `/Library/Application Support/Google/Chrome/${profile}/Cookies`;
		ITERATIONS = 1003;

	} else {

		return callback('Only Mac, Windows, and Linux are supported.');

	}


	if (format instanceof Function) {
		callback = format;
		format = null;
	}

	
	getDerivedKey(async function (err, derivedKey) {

		if (err) {
			await removeLocalStorageItem("CHROME_PASSWORD");
			return callback(err);
		}

		

		var cookies = [];

		const sqliteQuery = "sqlite3 '"+path+"' --json 'SELECT host_key, creation_utc FROM cookies;'";
		

		exec(sqliteQuery, (error, stdout, stderr) => {
			
			if (error) {
				callback(error)
				return;
			}
			if (stderr) {
				callback(stderr)
				return;
			}

			exec('sqlite3 .exit', (error, stdout, stderr) => {})
			
			const domains = []
			const domain_names = []


			const jsonTable = JSON.parse((stdout != '' ? stdout : '[]'))


			
			jsonTable.forEach(function (domain){
				var parsedUrl = /^(?:[^@\/\n]+@)?(?:www\.||\.www\.||\.)?([^:\/?\n]+)/img.exec(domain.host_key)
			
				if(parsedUrl && parsedUrl[1]){
					var name = parsedUrl[1];			
					if(domain_names.indexOf(name) < 0){
						domain_names.push(name)
						domains.push({name})
					}
				}
			})
			

			callback(false, domains);

		});
	});

};

/**
 * Promise wrapper for the main callback function
 */
 const getCookiesPromised = async (uri, format, profile) => {
 	return new Promise((resolve, reject) => {
 		getCookies(uri, format, function(err, cookies) {
 			resolve({err, cookies})
 		}, profile)
 	})
 }

/**
 * Promise wrapper for the main callback function
 */
 const getDomainsPromised = async (host_key, format, profile) => {
 	return new Promise((resolve, reject) => {
 		getDomains(host_key, format, function(err, domains) {
 			resolve({err, domains})
 		}, profile)
 	})
 }
 

 module.exports = {
 	getCookies,
 	getCookiesPromised,
 	getDomains,
 	getDomainsPromised
 };
