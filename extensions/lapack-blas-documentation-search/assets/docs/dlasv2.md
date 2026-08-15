```fortran
subroutine dlasv2 (
        double precision f,
        double precision g,
        double precision h,
        double precision ssmin,
        double precision ssmax,
        double precision snr,
        double precision csr,
        double precision snl,
        double precision csl
)
```

DLASV2 computes the singular value decomposition of a 2-by-2
triangular matrix
[  F   G  ]
[  0   H  ].
On return, abs(SSMAX) is the larger singular value, abs(SSMIN) is the
smaller singular value, and (CSL,SNL) and (CSR,SNR) are the left and
right singular vectors for abs(SSMAX), giving the decomposition

[ CSL  SNL ] [  F   G  ] [ CSR -SNR ]  =  [ SSMAX   0   ]
[-SNL  CSL ] [  0   H  ] [ SNR  CSR ]     [  0    SSMIN ].

## Parameters
F : DOUBLE PRECISION [in]
> The (1,1) element of the 2-by-2 matrix.

G : DOUBLE PRECISION [in]
> The (1,2) element of the 2-by-2 matrix.

H : DOUBLE PRECISION [in]
> The (2,2) element of the 2-by-2 matrix.

SSMIN : DOUBLE PRECISION [out]
> abs(SSMIN) is the smaller singular value.

SSMAX : DOUBLE PRECISION [out]
> abs(SSMAX) is the larger singular value.

SNL : DOUBLE PRECISION [out]

CSL : DOUBLE PRECISION [out]
> The vector (CSL, SNL) is a unit left singular vector for the
> singular value abs(SSMAX).

SNR : DOUBLE PRECISION [out]

CSR : DOUBLE PRECISION [out]
> The vector (CSR, SNR) is a unit right singular vector for the
> singular value abs(SSMAX).
