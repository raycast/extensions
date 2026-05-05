```fortran
subroutine slagv2 (
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( 2 ) alphar,
        real, dimension( 2 ) alphai,
        real, dimension( 2 ) beta,
        real csl,
        real snl,
        real csr,
        real snr
)
```

SLAGV2 computes the Generalized Schur factorization of a real 2-by-2
matrix pencil (A,B) where B is upper triangular. This routine
computes orthogonal (rotation) matrices given by CSL, SNL and CSR,
SNR such that

1) if the pencil (A,B) has two real eigenvalues (include 0/0 or 1/0
types), then

[ a11 a12 ] := [  CSL  SNL ] [ a11 a12 ] [  CSR -SNR ]
[  0  a22 ]    [ -SNL  CSL ] [ a21 a22 ] [  SNR  CSR ]

[ b11 b12 ] := [  CSL  SNL ] [ b11 b12 ] [  CSR -SNR ]
[  0  b22 ]    [ -SNL  CSL ] [  0  b22 ] [  SNR  CSR ],

2) if the pencil (A,B) has a pair of complex conjugate eigenvalues,
then

[ a11 a12 ] := [  CSL  SNL ] [ a11 a12 ] [  CSR -SNR ]
[ a21 a22 ]    [ -SNL  CSL ] [ a21 a22 ] [  SNR  CSR ]

[ b11  0  ] := [  CSL  SNL ] [ b11 b12 ] [  CSR -SNR ]
[  0  b22 ]    [ -SNL  CSL ] [  0  b22 ] [  SNR  CSR ]

where b11 >= b22 > 0.

## Parameters
A : REAL array, dimension (LDA, 2) [in,out]
> On entry, the 2 x 2 matrix A.
> On exit, A is overwritten by the ``A-part'' of the
> generalized Schur form.

LDA : INTEGER [in]
> THe leading dimension of the array A.  LDA >= 2.

B : REAL array, dimension (LDB, 2) [in,out]
> On entry, the upper triangular 2 x 2 matrix B.
> On exit, B is overwritten by the ``B-part'' of the
> generalized Schur form.

LDB : INTEGER [in]
> THe leading dimension of the array B.  LDB >= 2.

ALPHAR : REAL array, dimension (2) [out]

ALPHAI : REAL array, dimension (2) [out]

BETA : REAL array, dimension (2) [out]
> (ALPHAR(k)+i\*ALPHAI(k))/BETA(k) are the eigenvalues of the
> pencil (A,B), k=1,2, i = sqrt(-1).  Note that BETA(k) may
> be zero.

CSL : REAL [out]
> The cosine of the left rotation matrix.

SNL : REAL [out]
> The sine of the left rotation matrix.

CSR : REAL [out]
> The cosine of the right rotation matrix.

SNR : REAL [out]
> The sine of the right rotation matrix.
