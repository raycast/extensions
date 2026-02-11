```fortran
subroutine claesy (
        complex a,
        complex b,
        complex c,
        complex rt1,
        complex rt2,
        complex evscal,
        complex cs1,
        complex sn1
)
```

CLAESY computes the eigendecomposition of a 2-by-2 symmetric matrix
( ( A, B );( B, C ) )
provided the norm of the matrix of eigenvectors is larger than
some threshold value.

RT1 is the eigenvalue of larger absolute value, and RT2 of
smaller absolute value.  If the eigenvectors are computed, then
on return ( CS1, SN1 ) is the unit eigenvector for RT1, hence

[  CS1     SN1   ] . [ A  B ] . [ CS1    -SN1   ] = [ RT1  0  ]
[ -SN1     CS1   ]   [ B  C ]   [ SN1     CS1   ]   [  0  RT2 ]

## Parameters
A : COMPLEX [in]
> The ( 1, 1 ) element of input matrix.

B : COMPLEX [in]
> The ( 1, 2 ) element of input matrix.  The ( 2, 1 ) element
> is also given by B, since the 2-by-2 matrix is symmetric.

C : COMPLEX [in]
> The ( 2, 2 ) element of input matrix.

RT1 : COMPLEX [out]
> The eigenvalue of larger modulus.

RT2 : COMPLEX [out]
> The eigenvalue of smaller modulus.

EVSCAL : COMPLEX [out]
> The complex value by which the eigenvector matrix was scaled
> to make it orthonormal.  If EVSCAL is zero, the eigenvectors
> were not computed.  This means one of two things:  the 2-by-2
> matrix could not be diagonalized, or the norm of the matrix
> of eigenvectors before scaling was larger than the threshold
> value THRESH (set below).

CS1 : COMPLEX [out]

SN1 : COMPLEX [out]
> If EVSCAL .NE. 0,  ( CS1, SN1 ) is the unit right eigenvector
> for RT1.
