```fortran
subroutine dlanv2 (
        double precision a,
        double precision b,
        double precision c,
        double precision d,
        double precision rt1r,
        double precision rt1i,
        double precision rt2r,
        double precision rt2i,
        double precision cs,
        double precision sn
)
```

DLANV2 computes the Schur factorization of a real 2-by-2 nonsymmetric
matrix in standard form:

[ A  B ] = [ CS -SN ] [ AA  BB ] [ CS  SN ]
[ C  D ]   [ SN  CS ] [ CC  DD ] [-SN  CS ]

where either
1) CC = 0 so that AA and DD are real eigenvalues of the matrix, or
2) AA = DD and BB\*CC < 0, so that AA + or - sqrt(BB\*CC) are complex
conjugate eigenvalues.

## Parameters
A : DOUBLE PRECISION [in,out]

B : DOUBLE PRECISION [in,out]

C : DOUBLE PRECISION [in,out]

D : DOUBLE PRECISION [in,out]
> On entry, the elements of the input matrix.
> On exit, they are overwritten by the elements of the
> standardised Schur form.

RT1R : DOUBLE PRECISION [out]

RT1I : DOUBLE PRECISION [out]

RT2R : DOUBLE PRECISION [out]

RT2I : DOUBLE PRECISION [out]
> The real and imaginary parts of the eigenvalues. If the
> eigenvalues are a complex conjugate pair, RT1I > 0.

CS : DOUBLE PRECISION [out]

SN : DOUBLE PRECISION [out]
> Parameters of the rotation matrix.
