```fortran
subroutine slasv2 (
        real f,
        real g,
        real h,
        real ssmin,
        real ssmax,
        real snr,
        real csr,
        real snl,
        real csl
)
```

SLASV2 computes the singular value decomposition of a 2-by-2
triangular matrix
[  F   G  ]
[  0   H  ].
On return, abs(SSMAX) is the larger singular value, abs(SSMIN) is the
smaller singular value, and (CSL,SNL) and (CSR,SNR) are the left and
right singular vectors for abs(SSMAX), giving the decomposition

[ CSL  SNL ] [  F   G  ] [ CSR -SNR ]  =  [ SSMAX   0   ]
[-SNL  CSL ] [  0   H  ] [ SNR  CSR ]     [  0    SSMIN ].

## Parameters
F : REAL [in]
> The (1,1) element of the 2-by-2 matrix.

G : REAL [in]
> The (1,2) element of the 2-by-2 matrix.

H : REAL [in]
> The (2,2) element of the 2-by-2 matrix.

SSMIN : REAL [out]
> abs(SSMIN) is the smaller singular value.

SSMAX : REAL [out]
> abs(SSMAX) is the larger singular value.

SNL : REAL [out]

CSL : REAL [out]
> The vector (CSL, SNL) is a unit left singular vector for the
> singular value abs(SSMAX).

SNR : REAL [out]

CSR : REAL [out]
> The vector (CSR, SNR) is a unit right singular vector for the
> singular value abs(SSMAX).
