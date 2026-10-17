```fortran
subroutine clatrd (
        character uplo,
        integer n,
        integer nb,
        complex, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) e,
        complex, dimension( * ) tau,
        complex, dimension( ldw, * ) w,
        integer ldw
)
```

CLATRD reduces NB rows and columns of a complex Hermitian matrix A to
Hermitian tridiagonal form by a unitary similarity
transformation Q\*\*H \* A \* Q, and returns the matrices V and W which are
needed to apply the transformation to the unreduced part of A.

If UPLO = 'U', CLATRD reduces the last NB rows and columns of a
matrix, of which the upper triangle is supplied;
if UPLO = 'L', CLATRD reduces the first NB rows and columns of a
matrix, of which the lower triangle is supplied.

This is an auxiliary routine called by CHETRD.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> Hermitian matrix A is stored:
> = 'U': Upper triangular
> = 'L': Lower triangular

N : INTEGER [in]
> The order of the matrix A.

NB : INTEGER [in]
> The number of rows and columns to be reduced.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the Hermitian matrix A.  If UPLO = 'U', the leading
> n-by-n upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n-by-n lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> On exit:
> if UPLO = 'U', the last NB columns have been reduced to
> tridiagonal form, with the diagonal elements overwriting
> the diagonal elements of A; the elements above the diagonal
> with the array TAU, represent the unitary matrix Q as a
> product of elementary reflectors;
> if UPLO = 'L', the first NB columns have been reduced to
> tridiagonal form, with the diagonal elements overwriting
> the diagonal elements of A; the elements below the diagonal
> with the array TAU, represent the  unitary matrix Q as a
> product of elementary reflectors.
> See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : REAL array, dimension (N-1) [out]
> If UPLO = 'U', E(n-nb:n-1) contains the superdiagonal
> elements of the last NB columns of the reduced matrix;
> if UPLO = 'L', E(1:nb) contains the subdiagonal elements of
> the first NB columns of the reduced matrix.

TAU : COMPLEX array, dimension (N-1) [out]
> The scalar factors of the elementary reflectors, stored in
> TAU(n-nb:n-1) if UPLO = 'U', and in TAU(1:nb) if UPLO = 'L'.
> See Further Details.

W : COMPLEX array, dimension (LDW,NB) [out]
> The n-by-nb matrix W required to update the unreduced part
> of A.

LDW : INTEGER [in]
> The leading dimension of the array W. LDW >= max(1,N).
