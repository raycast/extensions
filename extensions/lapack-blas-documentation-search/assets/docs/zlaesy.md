```fortran
subroutine zlaesy (
        complex*16 a,
        complex*16 b,
        complex*16 c,
        complex*16 rt1,
        complex*16 rt2,
        complex*16 evscal,
        complex*16 cs1,
        complex*16 sn1
)
```

ZLAESY computes the eigendecomposition of a 2-by-2 symmetric matrix
( ( A, B );( B, C ) )
provided the norm of the matrix of eigenvectors is larger than
some threshold value.

RT1 is the eigenvalue of larger absolute value, and RT2 of
smaller absolute value.  If the eigenvectors are computed, then
on return ( CS1, SN1 ) is the unit eigenvector for RT1, hence

[  CS1     SN1   ] . [ A  B ] . [ CS1    -SN1   ] = [ RT1  0  ]
[ -SN1     CS1   ]   [ B  C ]   [ SN1     CS1   ]   [  0  RT2 ]

## Parameters
A : COMPLEX\*16 [in]
> The ( 1, 1 ) element of input matrix.

B : COMPLEX\*16 [in]
> The ( 1, 2 ) element of input matrix.  The ( 2, 1 ) element
> is also given by B, since the 2-by-2 matrix is symmetric.

C : COMPLEX\*16 [in]
> The ( 2, 2 ) element of input matrix.

RT1 : COMPLEX\*16 [out]
> The eigenvalue of larger modulus.

RT2 : COMPLEX\*16 [out]
> The eigenvalue of smaller modulus.

EVSCAL : COMPLEX\*16 [out]
> The complex value by which the eigenvector matrix was scaled
> to make it orthonormal.  If EVSCAL is zero, the eigenvectors
> were not computed.  This means one of two things:  the 2-by-2
> matrix could not be diagonalized, or the norm of the matrix
> of eigenvectors before scaling was larger than the threshold
> value THRESH (set below).

CS1 : COMPLEX\*16 [out]

SN1 : COMPLEX\*16 [out]
> If EVSCAL .NE. 0,  ( CS1, SN1 ) is the unit right eigenvector
> for RT1.
