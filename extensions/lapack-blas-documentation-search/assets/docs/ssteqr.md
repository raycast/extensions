```fortran
subroutine ssteqr (
        character compz,
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer info
)
```

SSTEQR computes all eigenvalues and, optionally, eigenvectors of a
symmetric tridiagonal matrix using the implicit QL or QR method.
The eigenvectors of a full or band symmetric matrix can also be found
if SSYTRD or SSPTRD or SSBTRD has been used to reduce this matrix to
tridiagonal form.

## Parameters
COMPZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only.
> = 'V':  Compute eigenvalues and eigenvectors of the original
> symmetric matrix.  On entry, Z must contain the
> orthogonal matrix used to reduce the original matrix
> to tridiagonal form.
> = 'I':  Compute eigenvalues and eigenvectors of the
> tridiagonal matrix.  Z is initialized to the identity
> matrix.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : REAL array, dimension (N) [in,out]
> On entry, the diagonal elements of the tridiagonal matrix.
> On exit, if INFO = 0, the eigenvalues in ascending order.

E : REAL array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix.
> On exit, E has been destroyed.

Z : REAL array, dimension (LDZ, N) [in,out]
> On entry, if  COMPZ = 'V', then Z contains the orthogonal
> matrix used in the reduction to tridiagonal form.
> On exit, if INFO = 0, then if  COMPZ = 'V', Z contains the
> orthonormal eigenvectors of the original symmetric matrix,
> and if COMPZ = 'I', Z contains the orthonormal eigenvectors
> of the symmetric tridiagonal matrix.
> If COMPZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> eigenvectors are desired, then  LDZ >= max(1,N).

WORK : REAL array, dimension (max(1,2\*N-2)) [out]
> If COMPZ = 'N', then WORK is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  the algorithm has failed to find all the eigenvalues in
> a total of 30\*N iterations; if INFO = i, then i
> elements of E have not converged to zero; on exit, D
> and E contain the elements of a symmetric tridiagonal
> matrix which is orthogonally similar to the original
> matrix.
