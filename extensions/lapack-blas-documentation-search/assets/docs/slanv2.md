```fortran
subroutine slanv2 (
        real a,
        real b,
        real c,
        real d,
        real rt1r,
        real rt1i,
        real rt2r,
        real rt2i,
        real cs,
        real sn
)
```

SLANV2 computes the Schur factorization of a real 2-by-2 nonsymmetric
matrix in standard form:

[ A  B ] = [ CS -SN ] [ AA  BB ] [ CS  SN ]
[ C  D ]   [ SN  CS ] [ CC  DD ] [-SN  CS ]

where either
1) CC = 0 so that AA and DD are real eigenvalues of the matrix, or
2) AA = DD and BB\*CC < 0, so that AA + or - sqrt(BB\*CC) are complex
conjugate eigenvalues.

## Parameters
A : REAL [in,out]

B : REAL [in,out]

C : REAL [in,out]

D : REAL [in,out]
> On entry, the elements of the input matrix.
> On exit, they are overwritten by the elements of the
> standardised Schur form.

RT1R : REAL [out]

RT1I : REAL [out]

RT2R : REAL [out]

RT2I : REAL [out]
> The real and imaginary parts of the eigenvalues. If the
> eigenvalues are a complex conjugate pair, RT1I > 0.

CS : REAL [out]

SN : REAL [out]
> Parameters of the rotation matrix.
