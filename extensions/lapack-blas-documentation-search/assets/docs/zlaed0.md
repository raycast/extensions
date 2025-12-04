```fortran
subroutine zlaed0 (
        integer qsiz,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        complex*16, dimension( ldqs, * ) qstore,
        integer ldqs,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer info
)
```

Using the divide and conquer method, ZLAED0 computes all eigenvalues
of a symmetric tridiagonal matrix which is one diagonal block of
those from reducing a dense or band Hermitian matrix and
corresponding eigenvectors of the dense or band matrix.

## Parameters
QSIZ : INTEGER [in]
> The dimension of the unitary matrix used to reduce
> the full matrix to tridiagonal form.  QSIZ >= N if ICOMPQ = 1.

N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the diagonal elements of the tridiagonal matrix.
> On exit, the eigenvalues in ascending order.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the off-diagonal elements of the tridiagonal matrix.
> On exit, E has been destroyed.

Q : COMPLEX\*16 array, dimension (LDQ,N) [in,out]
> On entry, Q must contain an QSIZ x N matrix whose columns
> unitarily orthonormal. It is a part of the unitary matrix
> that reduces the full dense Hermitian matrix to a
> (reducible) symmetric tridiagonal matrix.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

IWORK : INTEGER array, [out]
> the dimension of IWORK must be at least
> 6 + 6\*N + 5\*N\*lg N
> ( lg( N ) = smallest integer k
> such that 2^k >= N )

RWORK : DOUBLE PRECISION array, [out]
> dimension (1 + 3\*N + 2\*N\*lg N + 3\*N\*\*2)
> ( lg( N ) = smallest integer k
> such that 2^k >= N )

QSTORE : COMPLEX\*16 array, dimension (LDQS, N) [out]
> Used to store parts of
> the eigenvector matrix when the updating matrix multiplies
> take place.

LDQS : INTEGER [in]
> The leading dimension of the array QSTORE.
> LDQS >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  The algorithm failed to compute an eigenvalue while
> working on the submatrix lying in rows and columns
> INFO/(N+1) through mod(INFO,N+1).
